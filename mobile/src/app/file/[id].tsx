import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { WebView } from "react-native-webview";
import { useQuery } from "@tanstack/react-query";
import { Link2, Share2, X } from "lucide-react-native";
import { ItemIcon } from "~/components/item-icon";
import { ShareSheet, type ShareTarget } from "~/components/share-sheet";
import { useToast } from "~/components/toast";
import { fetchFile, fileUrl } from "~/lib/api";
import { openWith } from "~/lib/device-files";
import { useOrganization } from "~/lib/organization";
import { fileKindLabel, formatBytes, previewKind, type PreviewKind } from "~/lib/shared";
import { colors, radius } from "~/lib/theme";

/**
 * Aperçu plein écran : images (zoom), vidéos et audio (lecteur natif), PDF
 * (visionneuse native sur iOS), texte. Sinon : « Ouvrir avec… » une autre app.
 */
export default function FileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { isGuest } = useOrganization();
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const [opening, setOpening] = useState(false);

  const meta = useQuery({ queryKey: ["file", id], queryFn: () => fetchFile(id) });
  const file = meta.data;
  const kind = file ? previewKind(file.name, file.file_type, file.file_size) : null;
  // PDF : visionneuse WebKit sur iOS ; Android n'en a pas → « Ouvrir avec… ».
  const inline: PreviewKind | null = kind === "pdf" && Platform.OS !== "ios" ? null : kind;

  const url = useQuery({
    queryKey: ["file-url", id],
    queryFn: async () => {
      const r = await fileUrl(id, false);
      if (!r.ok) throw new Error(r.message);
      return r.url;
    },
    enabled: Boolean(inline),
    staleTime: 8 * 60_000,
  });

  async function shareCopy() {
    setOpening(true);
    const r = await openWith(id);
    setOpening(false);
    if (!r.ok) toast.error(r.message);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Fermer l'aperçu">
          <X size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {file?.name ?? ""}
          </Text>
          {file ? (
            <Text style={styles.meta} numberOfLines={1}>
              {fileKindLabel(file.name, file.file_type)} · {formatBytes(file.file_size)}
              {file.version > 1 ? ` · version ${file.version}` : ""}
            </Text>
          ) : null}
        </View>
        {file && !isGuest ? (
          <Pressable accessibilityRole="button"
            onPress={() => setSharing({ workspaceId: file.workspace_id, folderId: null, documentId: file.id, name: file.name })}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityLabel="Partager un lien"
          >
            <Link2 size={22} color="#fff" />
          </Pressable>
        ) : null}
        {file ? (
          <Pressable accessibilityRole="button" onPress={shareCopy} hitSlop={8} style={styles.headerBtn} accessibilityLabel="Ouvrir avec ou envoyer">
            {opening ? <ActivityIndicator color="#fff" /> : <Share2 size={22} color="#fff" />}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        {meta.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : !file ? (
          <Text style={styles.message}>Fichier introuvable ou supprimé.</Text>
        ) : !inline ? (
          <NoPreview name={file.name} mime={file.file_type} onOpen={shareCopy} busy={opening} />
        ) : url.isError ? (
          <Text style={styles.message}>{url.error.message}</Text>
        ) : !url.data ? (
          <ActivityIndicator color="#fff" />
        ) : inline === "image" ? (
          <ZoomableImage uri={url.data} cacheKey={`${file.id}-v${file.version}-full`} alt={file.name} />
        ) : inline === "video" || inline === "audio" ? (
          <Player uri={url.data} />
        ) : inline === "pdf" ? (
          <WebView source={{ uri: url.data }} style={styles.web} originWhitelist={["https://*"]} />
        ) : (
          <TextPreview uri={url.data} />
        )}
      </View>

      <ShareSheet target={sharing} onClose={() => setSharing(null)} />
    </SafeAreaView>
  );
}

function ZoomableImage({ uri, cacheKey, alt }: { uri: string; cacheKey: string; alt: string }) {
  const { width, height } = useWindowDimensions();
  return (
    <ScrollView
      maximumZoomScale={5}
      minimumZoomScale={1}
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Image source={{ uri, cacheKey }} alt={alt} style={{ width, height: height * 0.78 }} contentFit="contain" transition={150} cachePolicy="memory-disk" />
    </ScrollView>
  );
}

function Player({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => p.play());
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
    />
  );
}

function TextPreview({ uri }: { uri: string }) {
  const text = useQuery({ queryKey: ["text", uri], queryFn: () => fetch(uri).then((r) => r.text()) });
  if (!text.data) return <ActivityIndicator color="#fff" />;
  return (
    <ScrollView style={styles.textBox} contentContainerStyle={{ padding: 16 }}>
      <Text selectable style={styles.text}>
        {text.data}
      </Text>
    </ScrollView>
  );
}

function NoPreview({ name, mime, onOpen, busy }: { name: string; mime: string | null; onOpen: () => void; busy: boolean }) {
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 32 }}>
      <ItemIcon kind="file" name={name} mime={mime} size={72} />
      <Text style={[styles.name, { marginTop: 18, textAlign: "center" }]}>{name}</Text>
      <Text style={[styles.message, { marginTop: 6 }]}>Ouvrez ce fichier dans l&apos;application de votre choix.</Text>
      <Pressable onPress={onOpen} disabled={busy} style={styles.openBtn} accessibilityRole="button">
        {busy ? <ActivityIndicator color={colors.text} /> : <Share2 size={18} color={colors.text} />}
        <Text style={styles.openText}>Ouvrir avec…</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, minHeight: 56 },
  headerBtn: { padding: 10 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  message: { color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center", lineHeight: 21 },
  web: { flex: 1, width: "100%", backgroundColor: "#fff" },
  textBox: { flex: 1, alignSelf: "stretch", margin: 8, borderRadius: radius.md, backgroundColor: "#fff" },
  text: { fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }), fontSize: 13, lineHeight: 19, color: colors.text },
  openBtn: { marginTop: 24, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: radius.md, paddingHorizontal: 20, minHeight: 48 },
  openText: { fontSize: 16, fontWeight: "600", color: colors.text },
});
