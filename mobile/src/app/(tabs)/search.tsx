import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react-native";
import { ItemRow } from "~/components/item-row";
import { SpaceAvatar } from "~/components/space-avatar";
import { useItemActions } from "~/components/item-actions";
import { EmptyState } from "~/components/ui";
import { searchDrive } from "~/lib/api";
import { useActiveOrg, useOrganization } from "~/lib/organization";
import { colors, radius } from "~/lib/theme";

export default function SearchScreen() {
  const { organization } = useActiveOrg();
  const { isGuest } = useOrganization();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const actions = useItemActions({ canWrite: !isGuest, canShare: !isGuest });

  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 220);
    return () => clearTimeout(t);
  }, [text]);

  const results = useQuery({
    queryKey: ["search", organization.id, query],
    queryFn: () => searchDrive(organization.id, query),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
  });
  const r = query.length >= 2 ? results.data : undefined;
  const empty = r && !r.spaces.length && !r.folders.length && !r.files.length;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={styles.bar}>
        <Search size={19} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Fichiers, dossiers, espaces…"
          placeholderTextColor={colors.faint}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel="Rechercher dans le Drive"
        />
        {text ? (
          <Pressable accessibilityRole="button" onPress={() => setText("")} hitSlop={10} accessibilityLabel="Effacer">
            <X size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 32 }}>
        {!r ? (
          <EmptyState icon={<Search size={32} color={colors.faint} />} title="Rechercher dans le Drive" text="Tapez au moins deux lettres du nom d'un fichier, d'un dossier ou d'un espace." />
        ) : empty ? (
          <EmptyState icon={<Search size={32} color={colors.faint} />} title={`Aucun résultat pour « ${query} »`} />
        ) : (
          <>
            {r.spaces.length ? <Text style={styles.section}>Espaces</Text> : null}
            {r.spaces.map((s) => (
              <Pressable accessibilityRole="button"
                key={s.id}
                onPress={() => router.push({ pathname: "/space/[id]", params: { id: s.id } })}
                style={({ pressed }) => [styles.space, pressed && { backgroundColor: colors.card }]}
              >
                <SpaceAvatar name={s.name} size={36} />
                <Text style={styles.spaceName}>{s.name}</Text>
              </Pressable>
            ))}
            {r.folders.length ? <Text style={styles.section}>Dossiers</Text> : null}
            {r.folders.map((f) => (
              <ItemRow
                key={f.id}
                kind="folder"
                name={f.name}
                subtitle={`${f.workspace_name}${f.location ? ` › ${f.location}` : ""}`}
                onPress={() => router.push({ pathname: "/space/[id]", params: { id: f.workspace_id, folder: f.id } })}
              />
            ))}
            {r.files.length ? <Text style={styles.section}>Fichiers</Text> : null}
            {r.files.map((f) => (
              <ItemRow
                key={f.id}
                kind="file"
                name={f.name}
                mime={f.file_type}
                subtitle={`${f.workspace_name}${f.location ? ` › ${f.location}` : ""}`}
                onPress={() => router.push({ pathname: "/file/[id]", params: { id: f.id } })}
                onMore={() => actions.open({ kind: "file", id: f.id, name: f.name, workspaceId: f.workspace_id, parentId: f.folder_id })}
              />
            ))}
          </>
        )}
      </ScrollView>
      {actions.element}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 17, color: colors.text, paddingVertical: 10 },
  section: { marginTop: 18, marginBottom: 4, marginHorizontal: 20, fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  space: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 56 },
  spaceName: { fontSize: 16, fontWeight: "500", color: colors.text },
});
