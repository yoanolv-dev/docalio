import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronRight, FolderLock, Plus } from "lucide-react-native";
import { ScreenHeader } from "~/components/screen-header";
import { SpaceAvatar } from "~/components/space-avatar";
import { Sheet } from "~/components/sheet";
import { Button, EmptyState, ErrorText, Field, Loading } from "~/components/ui";
import { useToast } from "~/components/toast";
import { createSpace, fetchSpaces, type SpaceCard } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { relativeTime } from "~/lib/format";
import { useActiveOrg, useOrganization } from "~/lib/organization";
import { formatBytes } from "~/lib/shared";
import { colors, radius } from "~/lib/theme";

export default function HomeScreen() {
  const { organization } = useActiveOrg();
  const { isGuest } = useOrganization();
  const { session } = useAuth();
  const spaces = useQuery({ queryKey: ["spaces", organization.id], queryFn: () => fetchSpaces(organization.id) });
  const [creating, setCreating] = useState(false);
  const firstName = (session?.user.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  const renderItem = ({ item }: { item: SpaceCard }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/space/[id]", params: { id: item.id } })}
      style={({ pressed }) => [styles.space, pressed && { backgroundColor: colors.canvas }]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <SpaceAvatar name={item.name} color={item.primary_color} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.spaceName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.space_type === "internal" ? <FolderLock size={14} color={colors.muted} accessibilityLabel="Privé" /> : null}
          {item.client_company || item.client_email ? <Building2 size={14} color={colors.muted} accessibilityLabel="Espace client" /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {item.files} fichier{item.files > 1 ? "s" : ""} · {formatBytes(item.bytes)}
          {item.lastFileAt ? ` · ${relativeTime(item.lastFileAt)}` : ""}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.faint} />
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={spaces.data ?? []}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={spaces.isRefetching} onRefresh={() => spaces.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <ScreenHeader
              subtitle={organization.name}
              title={firstName ? `Bonjour ${firstName}` : "Accueil"}
              right={
                !isGuest ? (
                  <Pressable onPress={() => setCreating(true)} style={styles.add} accessibilityRole="button" accessibilityLabel="Nouvel espace">
                    <Plus size={22} color="#fff" />
                  </Pressable>
                ) : null
              }
            />
            <Text style={styles.section}>{isGuest ? "Espaces partagés avec vous" : "Espaces"}</Text>
          </>
        }
        ListEmptyComponent={
          spaces.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={<Building2 size={32} color={colors.faint} />}
              title={isGuest ? "Aucun espace partagé" : "Aucun espace pour l'instant"}
              text={isGuest ? "Les espaces ouverts à votre nom apparaîtront ici." : "Créez un espace par client, projet ou service."}
              action={!isGuest ? <Button label="Créer un espace" onPress={() => setCreating(true)} /> : undefined}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        style={{ flex: 1 }}
      />
      {creating ? <NewSpaceSheet onClose={() => setCreating(false)} /> : null}
    </SafeAreaView>
  );
}

function NewSpaceSheet({ onClose }: { onClose: () => void }) {
  const { organization } = useActiveOrg();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isPrivate, setPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!session) return;
    setBusy(true);
    const r = await createSpace({ organizationId: organization.id, userId: session.user.id, name, private: isPrivate });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    queryClient.invalidateQueries({ queryKey: ["spaces"] });
    toast.show(`Espace « ${name.trim()} » créé.`);
    onClose();
    router.push({ pathname: "/space/[id]", params: { id: r.id } });
  }

  return (
    <Sheet visible onClose={onClose} title="Nouvel espace" subtitle="Un espace par client, projet ou service.">
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        <Field label="Nom" value={name} onChangeText={setName} placeholder="Ex. Cabinet Martin, Chantier Lyon…" autoFocus maxLength={120} />
        <View style={styles.toggle}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Espace privé</Text>
            <Text style={styles.toggleText}>Visible seulement par vous, les administrateurs et les personnes ajoutées.</Text>
          </View>
          <Switch value={isPrivate} onValueChange={setPrivate} trackColor={{ true: colors.primary }} />
        </View>
        <ErrorText>{error}</ErrorText>
        <Button label="Créer l'espace" onPress={submit} loading={busy} disabled={!name.trim()} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  section: { marginTop: 18, marginBottom: 8, marginHorizontal: 20, fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  space: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.canvas, minHeight: 68 },
  spaceName: { flexShrink: 1, fontSize: 17, fontWeight: "600", color: colors.text },
  meta: { marginTop: 2, fontSize: 14, color: colors.muted },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 78 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.canvas },
  toggleTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  toggleText: { marginTop: 2, fontSize: 13, color: colors.muted, lineHeight: 18 },
});
