import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Share2, Trash2 } from "lucide-react-native";
import { Sheet } from "./sheet";
import { Button, ErrorText, Field } from "./ui";
import { useToast } from "./toast";
import { createLink, linkUrl, listLinks, revokeLink, type LinkPermission } from "~/lib/api";
import { confirm } from "~/lib/confirm";
import { shortDate } from "~/lib/format";
import { colors, radius } from "~/lib/theme";

export interface ShareTarget {
  workspaceId: string;
  folderId: string | null;
  documentId: string | null;
  name: string;
}

const EXPIRY = [
  { label: "Jamais", days: null },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
] as const;

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={[styles.chip, on && { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}
    >
      <Text style={[styles.chipText, on && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

/** Lien de partage sécurisé : consultation, téléchargement ou dépôt, mot de passe, expiration. */
export function ShareSheet({ target, onClose }: { target: ShareTarget | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [permission, setPermission] = useState<LinkPermission>("download");
  const [expiry, setExpiry] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const key = ["links", target?.workspaceId, target?.folderId, target?.documentId];
  const links = useQuery({ queryKey: key, queryFn: () => listLinks(target!), enabled: Boolean(target) });
  const showForm = creating || (links.data?.length ?? 0) === 0;

  function close() {
    setCreating(false);
    setPassword("");
    setError(null);
    onClose();
  }

  async function shareUrl(url: string) {
    await Clipboard.setStringAsync(url).catch(() => {});
    await Share.share({ message: url, url }).catch(() => {});
  }

  async function create() {
    if (!target) return;
    setBusy(true);
    setError(null);
    const r = await createLink({
      ...target,
      permission,
      expiresAt: expiry ? new Date(Date.now() + expiry * 86_400_000).toISOString() : null,
      password: password || null,
    });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    queryClient.invalidateQueries({ queryKey: ["links"] });
    queryClient.invalidateQueries({ queryKey: ["listing", target.workspaceId] });
    setCreating(false);
    setPassword("");
    toast.show("Lien créé et copié.");
    await shareUrl(r.url);
  }

  const isFile = Boolean(target?.documentId);

  return (
    <Sheet visible={Boolean(target)} onClose={close} title={`Partager « ${target?.name ?? ""} »`} subtitle="Toute personne disposant du lien y accède, sans compte.">
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        {!showForm ? (
          <>
            {links.data?.map((l) => (
              <View key={l.id} style={styles.link}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkTitle}>
                    {!l.can_view ? "Dépôt de fichiers" : l.can_download ? "Consultation et téléchargement" : "Consultation seule"}
                  </Text>
                  <Text style={styles.linkMeta}>
                    {l.has_password ? "Mot de passe · " : ""}
                    {l.expires_at ? `Expire le ${shortDate(l.expires_at)}` : "Sans expiration"} · {l.view_count} ouverture{l.view_count > 1 ? "s" : ""}
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Partager le lien" hitSlop={8} onPress={() => shareUrl(linkUrl(l.token))} style={styles.iconBtn}>
                  <Share2 size={19} color={colors.primary} />
                </Pressable>
                <Pressable accessibilityRole="button"
                  accessibilityLabel="Copier le lien"
                  hitSlop={8}
                  onPress={async () => {
                    await Clipboard.setStringAsync(linkUrl(l.token));
                    toast.show("Lien copié.");
                  }}
                  style={styles.iconBtn}
                >
                  <Copy size={19} color={colors.muted} />
                </Pressable>
                <Pressable accessibilityRole="button"
                  accessibilityLabel="Révoquer le lien"
                  hitSlop={8}
                  onPress={async () => {
                    if (!(await confirm("Révoquer ce lien ?", "Il cessera immédiatement de fonctionner.", "Révoquer"))) return;
                    const r = await revokeLink(l.id);
                    if (!r.ok) return toast.error(r.message);
                    queryClient.invalidateQueries({ queryKey: ["links"] });
                    queryClient.invalidateQueries({ queryKey: ["listing", target?.workspaceId] });
                    toast.show("Lien révoqué.");
                  }}
                  style={styles.iconBtn}
                >
                  <Trash2 size={19} color={colors.danger} />
                </Pressable>
              </View>
            ))}
            <Button label="Nouveau lien" variant="outline" onPress={() => setCreating(true)} />
          </>
        ) : (
          <>
            <Text style={styles.label}>Ce que la personne peut faire</Text>
            <View style={styles.row}>
              <Chip label="Consulter" on={permission === "view"} onPress={() => setPermission("view")} />
              <Chip label="Télécharger" on={permission === "download"} onPress={() => setPermission("download")} />
              {!isFile ? <Chip label="Déposer" on={permission === "upload"} onPress={() => setPermission("upload")} /> : null}
            </View>
            <Text style={styles.label}>Expiration</Text>
            <View style={styles.row}>
              {EXPIRY.map((e) => (
                <Chip key={e.label} label={e.label} on={expiry === e.days} onPress={() => setExpiry(e.days)} />
              ))}
            </View>
            <Field
              label="Mot de passe (facultatif)"
              value={password}
              onChangeText={setPassword}
              placeholder="Au moins 4 caractères"
              secureTextEntry
              autoCapitalize="none"
            />
            <ErrorText>{error}</ErrorText>
            <Button
              label="Créer et partager le lien"
              onPress={create}
              loading={busy}
              disabled={password.length > 0 && password.length < 4}
              icon={password ? <KeyRound size={18} color="#fff" /> : <Check size={18} color="#fff" />}
            />
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 15, fontWeight: "500", color: colors.text },
  link: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  linkTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  linkMeta: { marginTop: 2, fontSize: 13, color: colors.muted },
  iconBtn: { padding: 8 },
});
