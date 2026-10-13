import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Eye, FileUp, FolderOpen, FolderPlus, Images, Link2, Plus } from "lucide-react-native";
import { ItemRow } from "~/components/item-row";
import { useItemActions } from "~/components/item-actions";
import { PromptSheet } from "~/components/prompt-sheet";
import { ShareSheet, type ShareTarget } from "~/components/share-sheet";
import { ActionList, Sheet } from "~/components/sheet";
import { useToast } from "~/components/toast";
import { UploadBanner } from "~/components/upload-banner";
import { EmptyState, Loading } from "~/components/ui";
import { OrgGate } from "~/components/org-gate";
import { createFolder, fetchListing, fetchThumbnails, type DriveFile, type DriveFolder } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { pickDocuments, pickFromLibrary, takePhoto } from "~/lib/device-files";
import { relativeTime } from "~/lib/format";
import { useActiveOrg, useOrganization } from "~/lib/organization";
import { effectiveMaxFileBytes, formatBytes, resolvePlan } from "~/lib/shared";
import { useUploads, type PickedFile } from "~/lib/uploads";
import { colors } from "~/lib/theme";

type Row = { kind: "folder"; item: DriveFolder } | { kind: "file"; item: DriveFile };

export default function SpaceScreenRoute() {
  return (
    <OrgGate>
      <SpaceScreen />
    </OrgGate>
  );
}

function SpaceScreen() {
  const { id, folder } = useLocalSearchParams<{ id: string; folder?: string }>();
  const folderId = folder || null;
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { organization } = useActiveOrg();
  const { isGuest } = useOrganization();
  const uploads = useUploads();
  const [adding, setAdding] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const [sharing, setSharing] = useState<ShareTarget | null>(null);

  const listing = useQuery({ queryKey: ["listing", id, folderId], queryFn: () => fetchListing(id, folderId) });
  const data = listing.data;
  const thumbs = useQuery({
    queryKey: ["thumbs", id, folderId, data?.files.map((f) => `${f.id}:${f.version}`).join(",")],
    queryFn: () => fetchThumbnails(data?.files ?? []),
    enabled: Boolean(data?.files.length),
    staleTime: 8 * 60_000,
  });

  const canWrite = Boolean(data?.canWrite);
  const canShare = canWrite && !isGuest;
  const actions = useItemActions({ canWrite, canShare, tree: data?.tree });

  const rows = useMemo<Row[]>(
    () => [
      ...(data?.folders ?? []).map((item) => ({ kind: "folder" as const, item })),
      ...(data?.files ?? []).map((item) => ({ kind: "file" as const, item })),
    ],
    [data],
  );

  const current = data?.breadcrumb.at(-1);
  const title = current?.name ?? data?.workspace.name ?? "";
  const path = data ? [data.workspace.name, ...data.breadcrumb.slice(0, -1).map((b) => b.name)].join(" › ") : "";

  const upload = useCallback(
    async (pick: () => Promise<PickedFile[] | "denied">) => {
      if (!data) return;
      const files = await pick();
      if (files === "denied") return toast.error("Autorisez l'appareil photo dans les réglages du téléphone.");
      if (!files.length) return;
      uploads.enqueue(files, {
        organizationId: data.workspace.organization_id,
        workspaceId: data.workspace.id,
        folderId: data.folderId,
        takenNames: data.files.map((f) => f.name),
        maxBytes: effectiveMaxFileBytes(resolvePlan(organization)),
      });
    },
    [data, organization, toast, uploads],
  );

  const renderItem = useCallback(
    ({ item: row }: { item: Row }) => {
      if (row.kind === "folder") {
        const f = row.item;
        const count = f.files + f.folders;
        return (
          <ItemRow
            kind="folder"
            name={f.name}
            shared={f.shared}
            subtitle={`${count} élément${count > 1 ? "s" : ""}${f.bytes ? ` · ${formatBytes(f.bytes)}` : ""}`}
            onPress={() => router.push({ pathname: "/space/[id]", params: { id, folder: f.id } })}
            onMore={() => actions.open({ kind: "folder", id: f.id, name: f.name, workspaceId: id, parentId: f.parent_id })}
          />
        );
      }
      const f = row.item;
      return (
        <ItemRow
          kind="file"
          name={f.name}
          mime={f.file_type}
          shared={f.shared}
          thumbnail={thumbs.data?.[f.id]}
          cacheKey={`${f.id}-v${f.version}`}
          subtitle={`${formatBytes(f.file_size)} · ${relativeTime(f.file_updated_at)}`}
          onPress={() => router.push({ pathname: "/file/[id]", params: { id: f.id } })}
          onMore={() => actions.open({ kind: "file", id: f.id, name: f.name, workspaceId: id, parentId: f.folder_id })}
        />
      );
    },
    [actions, id, thumbs.data],
  );

  if (listing.isPending) return <Loading />;
  if (!data) {
    return (
      <EmptyState
        icon={<FolderOpen size={32} color={colors.faint} />}
        title="Espace introuvable"
        text="Il a peut-être été supprimé, ou votre accès a été retiré."
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack.Screen
        options={{
          title,
          headerRight: () =>
            canShare ? (
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Partager"
                onPress={() =>
                  setSharing({ workspaceId: id, folderId: data.folderId, documentId: null, name: title })
                }
              >
                <Link2 size={22} color={colors.primary} />
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.kind}:${r.item.id}`}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.head}>
            {path && data.folderId ? (
              <Text style={styles.path} numberOfLines={1}>
                {path}
              </Text>
            ) : null}
            {!canWrite ? (
              <View style={styles.readonly}>
                <Eye size={15} color={colors.muted} />
                <Text style={styles.readonlyText}>Lecture seule</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<FolderOpen size={32} color={colors.faint} />}
            title={data.folderId ? "Ce dossier est vide" : "Cet espace est vide"}
            text={canWrite ? "Ajoutez des photos, des documents ou un dossier avec le bouton +." : undefined}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl
            refreshing={listing.isRefetching}
            onRefresh={() => {
              listing.refetch();
              queryClient.invalidateQueries({ queryKey: ["thumbs", id, folderId] });
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        initialNumToRender={16}
        windowSize={9}
        removeClippedSubviews
      />

      {canWrite ? (
        <Pressable
          onPress={() => setAdding(true)}
          style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 20 }, pressed && { backgroundColor: colors.primaryPressed }]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter"
        >
          <Plus size={26} color="#fff" />
        </Pressable>
      ) : null}

      <UploadBanner bottom={insets.bottom + (canWrite ? 92 : 16)} />

      <Sheet visible={adding} onClose={() => setAdding(false)} title="Ajouter" subtitle={title}>
        <ActionList
          onDone={() => setAdding(false)}
          actions={[
            { label: "Prendre une photo", icon: Camera, onPress: () => upload(takePhoto) },
            { label: "Photos et vidéos", icon: Images, onPress: () => upload(pickFromLibrary) },
            { label: "Fichiers", icon: FileUp, onPress: () => upload(pickDocuments) },
            { label: "Nouveau dossier", icon: FolderPlus, onPress: () => setNewFolder(true) },
          ]}
        />
      </Sheet>

      {newFolder ? (
        <PromptSheet
          visible
          title="Nouveau dossier"
          label="Nom du dossier"
          confirmLabel="Créer"
          onClose={() => setNewFolder(false)}
          onSubmit={async (name) => {
            if (!session) return "Session expirée.";
            const r = await createFolder({
              organizationId: data.workspace.organization_id,
              workspaceId: id,
              parentId: data.folderId,
              userId: session.user.id,
              name,
            });
            if (!r.ok) return r.message;
            queryClient.invalidateQueries({ queryKey: ["listing", id] });
            return null;
          }}
        />
      ) : null}

      <ShareSheet target={sharing} onClose={() => setSharing(null)} />
      {actions.element}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 6, gap: 8 },
  path: { fontSize: 13, color: colors.muted },
  readonly: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: colors.card, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4 },
  readonlyText: { fontSize: 13, color: colors.muted, fontWeight: "500" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
