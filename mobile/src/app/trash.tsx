import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react-native";
import { ItemIcon } from "~/components/item-icon";
import { ActionList, Sheet } from "~/components/sheet";
import { useToast } from "~/components/toast";
import { EmptyState, Loading } from "~/components/ui";
import { OrgGate } from "~/components/org-gate";
import { fetchTrash, purgeItems, restoreItems, TRASH_RETENTION_DAYS, type TrashEntry } from "~/lib/api";
import { confirm } from "~/lib/confirm";
import { relativeTime, shortDate } from "~/lib/format";
import { useActiveOrg } from "~/lib/organization";
import { formatBytes } from "~/lib/shared";
import { colors } from "~/lib/theme";

const ids = (list: TrashEntry[]) => ({
  folderIds: list.filter((i) => i.kind === "folder").map((i) => i.id),
  documentIds: list.filter((i) => i.kind === "file").map((i) => i.id),
});

/** Corbeille : restaurer, supprimer définitivement, vider (30 jours de rétention). */
export default function TrashScreenRoute() {
  return (
    <OrgGate>
      <TrashScreen />
    </OrgGate>
  );
}

function TrashScreen() {
  const { organization } = useActiveOrg();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<TrashEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const trash = useQuery({ queryKey: ["trash", organization.id], queryFn: () => fetchTrash(organization.id) });
  const purgedExpired = useRef(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["trash"] });
    queryClient.invalidateQueries({ queryKey: ["listing"] });
    queryClient.invalidateQueries({ queryKey: ["spaces"] });
    queryClient.invalidateQueries({ queryKey: ["recents"] });
  };

  // Comme sur le site : à l'ouverture, les éléments de plus de 30 jours sont effacés.
  useEffect(() => {
    if (!trash.data || purgedExpired.current) return;
    purgedExpired.current = true;
    const expired = trash.data.filter((i) => new Date(i.purge_at).getTime() < Date.now());
    if (!expired.length) return;
    purgeItems(ids(expired)).then((r) => {
      if (r.ok) queryClient.invalidateQueries({ queryKey: ["trash"] });
    });
  }, [trash.data, queryClient]);

  async function restore(list: TrashEntry[]) {
    setBusy(true);
    const r = await restoreItems(ids(list));
    setBusy(false);
    if (!r.ok) return toast.error(r.message);
    refresh();
    toast.show(list.length === 1 ? `« ${list[0].name} » restauré.` : `${list.length} éléments restaurés.`);
  }

  async function purge(list: TrashEntry[], all: boolean) {
    const ok = await confirm(
      all ? "Vider la corbeille ?" : `Supprimer « ${list[0].name} » définitivement ?`,
      "Les fichiers et toutes leurs versions seront effacés pour de bon. Cette action est irréversible.",
      "Supprimer définitivement",
    );
    if (!ok) return;
    setBusy(true);
    const r = await purgeItems(ids(list));
    setBusy(false);
    if (!r.ok) return toast.error(r.message);
    refresh();
    toast.show(all ? "Corbeille vidée." : "Supprimé définitivement.");
  }

  const items = trash.data ?? [];
  const total = items.reduce((s, i) => s + i.size, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack.Screen
        options={{
          headerRight: () =>
            items.length ? (
              <Pressable onPress={() => purge(items, true)} disabled={busy} hitSlop={8} accessibilityRole="button" accessibilityLabel="Vider">
                <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "600" }}>Vider</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.kind}:${i.id}`}
        ListHeaderComponent={
          items.length ? (
            <Text style={styles.info}>
              {items.length} élément{items.length > 1 ? "s" : ""} · {formatBytes(total)} · supprimés définitivement après {TRASH_RETENTION_DAYS} jours
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => setSelected(item)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.card }]}>
            <ItemIcon kind={item.kind} name={item.name} mime={item.file_type} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.workspace_name} · supprimé {relativeTime(item.deleted_at)} · jusqu&apos;au {shortDate(item.purge_at)}
              </Text>
            </View>
            <Pressable onPress={() => restore([item])} disabled={busy} hitSlop={8} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel={`Restaurer ${item.name}`}>
              <RotateCcw size={20} color={colors.primary} />
            </Pressable>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          trash.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={<Trash2 size={32} color={colors.faint} />}
              title="La corbeille est vide"
              text={`Les éléments supprimés restent ici ${TRASH_RETENTION_DAYS} jours : vous pouvez les restaurer en un geste.`}
            />
          )
        }
        refreshControl={<RefreshControl refreshing={trash.isRefetching} onRefresh={() => trash.refetch()} tintColor={colors.primary} />}
      />
      <Sheet visible={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected ? (
          <ActionList
            onDone={() => setSelected(null)}
            actions={[
              { label: "Restaurer", icon: RotateCcw, onPress: () => restore([selected]) },
              { label: "Supprimer définitivement", icon: Trash2, destructive: true, onPress: () => purge([selected], false) },
            ]}
          />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { marginHorizontal: 16, marginTop: 4, marginBottom: 10, fontSize: 13, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, minHeight: 64, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: "500", color: colors.text },
  meta: { marginTop: 2, fontSize: 13, color: colors.muted },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
});
