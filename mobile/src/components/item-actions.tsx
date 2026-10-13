import { useCallback, useState, type ReactNode } from "react";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, FolderInput, Link2, Pencil, Share2, Trash2 } from "lucide-react-native";
import { ActionList, Sheet } from "./sheet";
import { PromptSheet } from "./prompt-sheet";
import { ShareSheet, type ShareTarget } from "./share-sheet";
import { MoveSheet } from "./move-sheet";
import { useToast } from "./toast";
import { moveItems, renameItem, trashItems, type FolderNode, type Listing } from "~/lib/api";
import { confirm } from "~/lib/confirm";
import { openWith } from "~/lib/device-files";

export interface ActionItem {
  kind: "file" | "folder";
  id: string;
  name: string;
  workspaceId: string;
  /** Dossier parent (fichier : son dossier ; dossier : son parent). */
  parentId: string | null;
}

/**
 * Menu d'actions d'un fichier ou d'un dossier, commun à l'explorateur, aux
 * récents et à la recherche. Les droits réels restent vérifiés par la base.
 */
export function useItemActions(options: { canWrite: boolean; canShare: boolean; tree?: FolderNode[] }): {
  open: (item: ActionItem) => void;
  element: ReactNode;
} {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [item, setItem] = useState<ActionItem | null>(null);
  const [renaming, setRenaming] = useState<ActionItem | null>(null);
  const [moving, setMoving] = useState<ActionItem | null>(null);
  const [sharing, setSharing] = useState<ShareTarget | null>(null);

  const refresh = useCallback(
    (workspaceId: string) => {
      queryClient.invalidateQueries({ queryKey: ["listing", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["recents"] });
      queryClient.invalidateQueries({ queryKey: ["search"] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
    [queryClient],
  );

  const show = (i: ActionItem) => {
    if (i.kind === "folder") router.push({ pathname: "/space/[id]", params: { id: i.workspaceId, folder: i.id } });
    else router.push({ pathname: "/file/[id]", params: { id: i.id } });
  };

  const element = (
    <>
      <Sheet visible={Boolean(item)} onClose={() => setItem(null)} title={item?.name}>
        {item ? (
          <ActionList
            onDone={() => setItem(null)}
            actions={[
              { label: item.kind === "folder" ? "Ouvrir" : "Aperçu", icon: Eye, onPress: () => show(item) },
              {
                label: "Partager un lien",
                icon: Link2,
                hidden: !options.canShare,
                onPress: () =>
                  setSharing({
                    workspaceId: item.workspaceId,
                    folderId: item.kind === "folder" ? item.id : null,
                    documentId: item.kind === "file" ? item.id : null,
                    name: item.name,
                  }),
              },
              {
                label: "Ouvrir avec… / Envoyer",
                icon: Share2,
                hidden: item.kind !== "file",
                onPress: async () => {
                  const r = await openWith(item.id);
                  if (!r.ok) toast.error(r.message);
                },
              },
              { label: "Renommer", icon: Pencil, hidden: !options.canWrite, onPress: () => setRenaming(item) },
              { label: "Déplacer", icon: FolderInput, hidden: !options.canWrite || !options.tree, onPress: () => setMoving(item) },
              {
                label: "Mettre à la corbeille",
                icon: Trash2,
                destructive: true,
                hidden: !options.canWrite,
                onPress: async () => {
                  const ok = await confirm(
                    `Mettre « ${item.name} » à la corbeille ?`,
                    "Vous pourrez le restaurer pendant 30 jours depuis la corbeille.",
                    "Mettre à la corbeille",
                  );
                  if (!ok) return;
                  const r = await trashItems({
                    folderIds: item.kind === "folder" ? [item.id] : [],
                    documentIds: item.kind === "file" ? [item.id] : [],
                  });
                  if (!r.ok) return toast.error(r.message);
                  // Retrait immédiat de la liste affichée, puis resynchronisation.
                  queryClient.setQueriesData<Listing | null>({ queryKey: ["listing", item.workspaceId] }, (old) =>
                    old
                      ? { ...old, folders: old.folders.filter((f) => f.id !== item.id), files: old.files.filter((f) => f.id !== item.id) }
                      : old,
                  );
                  refresh(item.workspaceId);
                  queryClient.invalidateQueries({ queryKey: ["trash"] });
                  toast.show(`« ${item.name} » placé dans la corbeille.`);
                },
              },
            ]}
          />
        ) : null}
      </Sheet>

      {renaming ? (
        <PromptSheet
          key={renaming.id}
          visible
          title={renaming.kind === "folder" ? "Renommer le dossier" : "Renommer le fichier"}
          initial={renaming.name}
          selectBase={renaming.kind === "file"}
          confirmLabel="Renommer"
          onClose={() => setRenaming(null)}
          onSubmit={async (value) => {
            const r = await renameItem(renaming.kind, renaming.id, value);
            if (!r.ok) return r.message;
            refresh(renaming.workspaceId);
            return null;
          }}
        />
      ) : null}

      {moving && options.tree ? (
        <MoveSheet
          visible
          name={moving.name}
          tree={options.tree}
          movingFolderId={moving.kind === "folder" ? moving.id : null}
          currentParentId={moving.parentId}
          onClose={() => setMoving(null)}
          onPick={async (target) => {
            const m = moving;
            setMoving(null);
            const r = await moveItems({
              workspaceId: m.workspaceId,
              tree: options.tree ?? [],
              folderIds: m.kind === "folder" ? [m.id] : [],
              documentIds: m.kind === "file" ? [m.id] : [],
              targetFolderId: target,
            });
            if (!r.ok) return toast.error(r.message);
            refresh(m.workspaceId);
            toast.show(`« ${m.name} » déplacé.`);
          }}
        />
      ) : null}

      <ShareSheet target={sharing} onClose={() => setSharing(null)} />
    </>
  );

  return { open: setItem, element };
}
