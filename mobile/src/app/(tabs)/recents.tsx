import { useCallback } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react-native";
import { ScreenHeader } from "~/components/screen-header";
import { ItemRow } from "~/components/item-row";
import { useItemActions } from "~/components/item-actions";
import { EmptyState, Loading } from "~/components/ui";
import { fetchRecents, type LocatedFile } from "~/lib/api";
import { relativeTime } from "~/lib/format";
import { useActiveOrg, useOrganization } from "~/lib/organization";
import { colors } from "~/lib/theme";

export default function RecentsScreen() {
  const { organization } = useActiveOrg();
  const { isGuest } = useOrganization();
  const recents = useQuery({ queryKey: ["recents", organization.id], queryFn: () => fetchRecents(organization.id) });
  const actions = useItemActions({ canWrite: !isGuest, canShare: !isGuest });

  const renderItem = useCallback(
    ({ item }: { item: LocatedFile }) => (
      <ItemRow
        kind="file"
        name={item.name}
        mime={item.file_type}
        subtitle={`${item.workspace_name}${item.location ? ` › ${item.location}` : ""} · ${relativeTime(item.file_updated_at)}`}
        onPress={() => router.push({ pathname: "/file/[id]", params: { id: item.id } })}
        onMore={() =>
          actions.open({ kind: "file", id: item.id, name: item.name, workspaceId: item.workspace_id, parentId: item.folder_id })
        }
      />
    ),
    [actions],
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={recents.data ?? []}
        keyExtractor={(f) => f.id}
        renderItem={renderItem}
        ListHeaderComponent={<ScreenHeader title="Récents" subtitle="Derniers fichiers ajoutés ou modifiés" />}
        ListEmptyComponent={
          recents.isPending ? <Loading /> : <EmptyState icon={<Clock size={32} color={colors.faint} />} title="Aucun fichier récent" />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={recents.isRefetching} onRefresh={() => recents.refetch()} tintColor={colors.primary} />}
        initialNumToRender={14}
        windowSize={7}
      />
      {actions.element}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
});
