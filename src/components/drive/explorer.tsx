"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDownAZ,
  ArrowUpDown,
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FolderInput,
  FolderPlus,
  FolderUp,
  Info,
  LayoutGrid,
  Link2,
  List,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ContextMenu, type ContextMenuEntry, type ContextMenuState } from "@/components/drive/context-menu";
import { NameDialog } from "@/components/drive/name-dialog";
import { ItemIcon } from "@/components/drive/item-icon";
import { MoveDialog } from "@/components/drive/move-dialog";
import { ShareDialog, type ShareTarget } from "@/components/drive/share-dialog";
import { FilePreview, type PreviewFile } from "@/components/drive/file-preview";
import { FileDetailsPanel } from "@/components/drive/file-details";
import { useUploads } from "@/components/drive/upload-provider";
import {
  createFolderAction,
  getFileUrlAction,
  getThumbnailsAction,
  getZipEntriesAction,
  moveItemsAction,
  renameItemAction,
  restoreItemsAction,
  setClientVisibilityAction,
  trashItemsAction,
} from "@/lib/actions/drive";
import type { DriveFile, DriveFolder, DriveListing } from "@/lib/drive";
import { entriesFromDataTransfer, entriesFromInput, isFileDrag } from "@/lib/drop-files";
import { downloadAsZip, triggerDownload } from "@/lib/client-download";
import { useLocalPreference } from "@/lib/use-local-preference";
import { collectDescendantIds } from "@/lib/folder-tree";
import { fileKind, fileKindLabel, formatBytes } from "@/lib/files";
import { cn, formatRelativeTime } from "@/lib/utils";

// =============================================================================
// Explorateur du Drive : liste ou grille, sélection multiple (Ctrl / Maj),
// glisser-déposer (import depuis l'ordinateur, dossiers compris, et
// déplacement interne), menu contextuel, raccourcis clavier, aperçu, détails,
// partage, corbeille avec « Annuler ».
// =============================================================================

type Row =
  | { key: string; kind: "folder"; id: string; name: string; modified: string; size: number; folder: DriveFolder }
  | { key: string; kind: "file"; id: string; name: string; modified: string; size: number; file: DriveFile };

const SORTS = ["name", "modified", "size"] as const;
type SortKey = (typeof SORTS)[number];
const DRAG_TYPE = "application/x-docalio-items";

function folderHref(workspaceId: string, folderId: string | null) {
  return folderId ? `/dashboard/workspaces/${workspaceId}?dossier=${folderId}` : `/dashboard/workspaces/${workspaceId}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function Explorer({
  listing,
  clientSpace,
  canShare,
  initialPreviewId = null,
}: {
  listing: DriveListing;
  /** Espace partagé avec un client (portail) : visibilité par fichier. */
  clientSpace: boolean;
  /** Peut créer des liens et inviter (membre avec droit d'écriture). */
  canShare: boolean;
  /** Fichier à ouvrir en aperçu dès l'arrivée (recherche, récents). */
  initialPreviewId?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const uploads = useUploads();
  const { workspace, folderId, breadcrumb, folders, files, tree, people, canWrite } = listing;

  const [view, setView] = useLocalPreference("docalio:drive-view", "list", ["list", "grid"] as const);
  const [sort, setSort] = useLocalPreference<SortKey>("docalio:drive-sort", "name", SORTS);
  const [desc, setDesc] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [osDrag, setOsDrag] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragDepth = useRef(0);

  const [nameDialog, setNameDialog] = useState<
    { mode: "new" } | { mode: "rename"; kind: "file" | "folder"; id: string; name: string } | null
  >(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [moveIds, setMoveIds] = useState<{ folderIds: string[]; documentIds: string[] } | null>(null);
  const [share, setShare] = useState<ShareTarget | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(initialPreviewId);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [zipping, setZipping] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const versionInput = useRef<HTMLInputElement>(null);
  const versionTarget = useRef<DriveFile | null>(null);

  // La sélection ne survit pas à un changement de dossier.
  const [prevFolder, setPrevFolder] = useState(folderId);
  if (prevFolder !== folderId) {
    setPrevFolder(folderId);
    setSelected(new Set());
    setAnchor(null);
    setPreviewId(null);
  }
  const [prevInitial, setPrevInitial] = useState(initialPreviewId);
  if (prevInitial !== initialPreviewId) {
    setPrevInitial(initialPreviewId);
    if (initialPreviewId) setPreviewId(initialPreviewId);
  }

  // --- Lignes triées (dossiers d'abord) --------------------------------------
  const rows = useMemo<Row[]>(() => {
    const dir = desc ? -1 : 1;
    const cmp = (a: Row, b: Row) => {
      if (sort === "modified") return dir * (new Date(a.modified).getTime() - new Date(b.modified).getTime());
      if (sort === "size") return dir * (a.size - b.size);
      return dir * a.name.localeCompare(b.name, "fr", { numeric: true, sensitivity: "base" });
    };
    const f: Row[] = folders.map((folder) => ({
      key: `d:${folder.id}`,
      kind: "folder",
      id: folder.id,
      name: folder.name,
      modified: folder.updated_at,
      size: folder.bytes,
      folder,
    }));
    const d: Row[] = files.map((file) => ({
      key: `f:${file.id}`,
      kind: "file",
      id: file.id,
      name: file.name,
      modified: file.file_updated_at,
      size: file.file_size ?? 0,
      file,
    }));
    return [...f.sort(cmp), ...d.sort(cmp)];
  }, [folders, files, sort, desc]);

  const previewFiles = useMemo<PreviewFile[]>(
    () => rows.filter((r): r is Extract<Row, { kind: "file" }> => r.kind === "file").map((r) => r.file),
    [rows]
  );

  const previewIndex = previewId ? previewFiles.findIndex((f) => f.id === previewId) : -1;
  const selectedRows = rows.filter((r) => selected.has(r.key));
  const split = (list: Row[]) => ({
    folderIds: list.filter((r) => r.kind === "folder").map((r) => r.id),
    documentIds: list.filter((r) => r.kind === "file").map((r) => r.id),
  });

  const locationLabel = breadcrumb.map((b) => b.name).join(" › ");
  const detailsFile = detailsId ? files.find((f) => f.id === detailsId) ?? null : null;

  // --- Grille : miniatures des images -----------------------------------------
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const imageIds = useMemo(
    () => files.filter((f) => fileKind(f.name, f.file_type) === "image").map((f) => f.id),
    [files]
  );
  useEffect(() => {
    if (view !== "grid" || imageIds.length === 0) return;
    let cancelled = false;
    getThumbnailsAction(imageIds).then((map) => {
      if (!cancelled) setThumbs((t) => ({ ...t, ...map }));
    });
    return () => {
      cancelled = true;
    };
  }, [view, imageIds]);

  // --- Actions ------------------------------------------------------------------

  const openRow = useCallback(
    (row: Row) => {
      if (row.kind === "folder") router.push(folderHref(workspace.id, row.id));
      else setPreviewId(row.id);
    },
    [router, workspace.id]
  );

  const download = useCallback(
    async (list: Row[]) => {
      if (list.length === 1 && list[0].kind === "file") {
        const r = await getFileUrlAction(list[0].id, { download: true });
        if (r.ok) triggerDownload(r.url, r.name);
        else toast.error(r.message);
        return;
      }
      const ids = split(list);
      const zipName =
        list.length === 1 ? list[0].name : breadcrumb.at(-1)?.name ?? workspace.name;
      setZipping("Préparation du ZIP…");
      const r = await getZipEntriesAction({ workspaceId: workspace.id, ...ids });
      if (!r.ok) {
        setZipping(null);
        toast.error(r.message);
        return;
      }
      try {
        await downloadAsZip(r.entries, zipName, (done, total) => setZipping(`ZIP : ${done} / ${total} fichiers`));
      } catch {
        toast.error("Le ZIP n'a pas pu être créé. Réessayez.");
      }
      setZipping(null);
    },
    [breadcrumb, toast, workspace.id, workspace.name]
  );

  const trash = useCallback(
    (list: Row[]) => {
      if (!canWrite || list.length === 0) return;
      const ids = split(list);
      start(async () => {
        const r = await trashItemsAction(ids);
        if (!r.ok) {
          toast.error(r.message);
          return;
        }
        setSelected(new Set());
        toast.show(
          list.length === 1 ? `« ${list[0].name} » placé dans la corbeille.` : `${list.length} éléments placés dans la corbeille.`,
          {
            action: {
              label: "Annuler",
              onClick: () => {
                void restoreItemsAction(ids).then((res) => {
                  if (!res.ok) toast.error(res.message);
                });
              },
            },
          }
        );
      });
    },
    [canWrite, toast]
  );

  const moveTo = useCallback(
    async (ids: { folderIds: string[]; documentIds: string[] }, target: string | null, targetName: string) => {
      const r = await moveItemsAction({ workspaceId: workspace.id, ...ids, targetFolderId: target });
      if (!r.ok) {
        toast.error(r.message);
        return false;
      }
      const n = ids.folderIds.length + ids.documentIds.length;
      setSelected(new Set());
      toast.show(n === 1 ? `Déplacé vers « ${targetName} ».` : `${n} éléments déplacés vers « ${targetName} ».`, {
        action: {
          label: "Annuler",
          onClick: () => {
            void moveItemsAction({ workspaceId: workspace.id, ...ids, targetFolderId: folderId });
          },
        },
      });
      return true;
    },
    [folderId, toast, workspace.id]
  );

  const setVisibility = useCallback(
    (list: Row[], visible: boolean) => {
      const ids = list.filter((r) => r.kind === "file").map((r) => r.id);
      if (!ids.length) return;
      start(async () => {
        const r = await setClientVisibilityAction(ids, visible);
        if (r.ok) toast.show(visible ? "Visible sur le portail client." : "Masqué du portail client.");
        else toast.error(r.message);
      });
    },
    [toast]
  );

  const shareRow = useCallback(
    (row: Row) => {
      setShare({
        workspaceId: workspace.id,
        folderId: row.kind === "folder" ? row.id : null,
        documentId: row.kind === "file" ? row.id : null,
        kind: row.kind,
        name: row.name,
        mime: row.kind === "file" ? row.file.file_type : null,
      });
    },
    [workspace.id]
  );

  function shareCurrent() {
    const current = breadcrumb.at(-1);
    setShare({
      workspaceId: workspace.id,
      folderId: current?.id ?? null,
      documentId: null,
      kind: current ? "folder" : "space",
      name: current?.name ?? workspace.name,
    });
  }

  function enqueueFiles(entries: Parameters<typeof uploads.enqueue>[1], targetFolderId = folderId) {
    if (!canWrite) {
      toast.error("Vous avez un accès en lecture seule à cet espace.");
      return;
    }
    uploads.enqueue(
      {
        workspaceId: workspace.id,
        folderId: targetFolderId,
        existing: targetFolderId === folderId ? files.map((f) => ({ id: f.id, name: f.name })) : [],
      },
      entries
    );
  }

  // --- Sélection -------------------------------------------------------------

  function clickRow(e: React.MouseEvent, index: number, row: Row) {
    if (e.shiftKey && anchor !== null) {
      const [a, b] = [Math.min(anchor, index), Math.max(anchor, index)];
      setSelected(new Set(rows.slice(a, b + 1).map((r) => r.key)));
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      setSelected((s) => {
        const n = new Set(s);
        if (n.has(row.key)) n.delete(row.key);
        else n.add(row.key);
        return n;
      });
      setAnchor(index);
      return;
    }
    // Écran tactile : un appui ouvre directement.
    if (window.matchMedia("(pointer: coarse)").matches && selected.size === 0) {
      openRow(row);
      return;
    }
    setSelected(new Set([row.key]));
    setAnchor(index);
  }

  function toggleRow(row: Row, index: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(row.key)) n.delete(row.key);
      else n.add(row.key);
      return n;
    });
    setAnchor(index);
  }

  // --- Menu contextuel ---------------------------------------------------------

  function menuFor(row: Row): ContextMenuEntry[] {
    const list = selected.has(row.key) && selected.size > 1 ? selectedRows : [row];
    const multi = list.length > 1;
    const filesOnly = list.filter((r) => r.kind === "file");
    const entries: ContextMenuEntry[] = [];
    if (!multi) {
      entries.push({ label: row.kind === "folder" ? "Ouvrir" : "Aperçu", icon: row.kind === "folder" ? FolderInput : Eye, onSelect: () => openRow(row) });
    }
    entries.push({ label: multi || row.kind === "folder" ? "Télécharger (ZIP)" : "Télécharger", icon: Download, onSelect: () => void download(list) });
    if (!multi && canShare) entries.push({ label: "Partager", icon: Share2, onSelect: () => shareRow(row) });
    if (!multi && row.kind === "file") entries.push({ label: "Détails et versions", icon: Info, onSelect: () => setDetailsId(row.id) });
    if (canWrite) {
      entries.push({ type: "separator" });
      if (!multi) {
        entries.push({
          label: "Renommer",
          icon: Pencil,
          onSelect: () => {
            setNameError(null);
            setNameDialog({ mode: "rename", kind: row.kind, id: row.id, name: row.name });
          },
        });
      }
      entries.push({ label: "Déplacer vers…", icon: FolderInput, onSelect: () => setMoveIds(split(list)) });
      if (!multi && row.kind === "file") {
        entries.push({
          label: "Importer une nouvelle version",
          icon: Upload,
          onSelect: () => {
            versionTarget.current = row.file;
            versionInput.current?.click();
          },
        });
      }
      if (clientSpace && filesOnly.length) {
        const allVisible = filesOnly.every((r) => r.kind === "file" && r.file.is_visible_to_client);
        entries.push({
          label: allVisible ? "Masquer du portail client" : "Afficher sur le portail client",
          icon: allVisible ? EyeOff : Eye,
          onSelect: () => setVisibility(filesOnly, !allVisible),
        });
      }
      entries.push({ type: "separator" });
      entries.push({ label: "Mettre à la corbeille", icon: Trash2, destructive: true, onSelect: () => trash(list) });
    }
    return entries;
  }

  function backgroundMenu(e: React.MouseEvent) {
    if (!canWrite) return;
    e.preventDefault();
    setSelected(new Set());
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Nouveau dossier", icon: FolderPlus, onSelect: () => { setNameError(null); setNameDialog({ mode: "new" }); } },
        { label: "Importer des fichiers", icon: Upload, onSelect: () => fileInput.current?.click() },
        { label: "Importer un dossier", icon: FolderUp, onSelect: () => folderInput.current?.click() },
      ],
    });
  }

  // --- Clavier -------------------------------------------------------------------

  const overlayOpen = Boolean(nameDialog || moveIds || share || previewIndex >= 0 || menu);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (overlayOpen || isTypingTarget(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(new Set(rows.map((r) => r.key)));
      } else if (e.key === "Escape") {
        setSelected(new Set());
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedRows.length) {
        e.preventDefault();
        trash(selectedRows);
      } else if (e.key === "F2" && selectedRows.length === 1 && canWrite) {
        e.preventDefault();
        const r = selectedRows[0];
        setNameError(null);
        setNameDialog({ mode: "rename", kind: r.kind, id: r.id, name: r.name });
      } else if (e.key === "Enter" && selectedRows.length === 1) {
        e.preventDefault();
        openRow(selectedRows[0]);
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && rows.length) {
        e.preventDefault();
        const current = anchor ?? (e.key === "ArrowDown" ? -1 : rows.length);
        const next = Math.max(0, Math.min(rows.length - 1, current + (e.key === "ArrowDown" ? 1 : -1)));
        setSelected(new Set([rows[next].key]));
        setAnchor(next);
        document.getElementById(`row-${rows[next].key}`)?.scrollIntoView({ block: "nearest" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen, rows, selectedRows, anchor, canWrite, trash, openRow]);

  // --- Glisser-déposer --------------------------------------------------------

  const resetOsDrag = useCallback(() => {
    dragDepth.current = 0;
    setOsDrag(false);
  }, []);

  function onDragEnter(e: React.DragEvent) {
    if (!isFileDrag(e) || !canWrite) return;
    dragDepth.current += 1;
    setOsDrag(true);
  }
  function onDragLeave(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setOsDrag(false);
  }
  async function onDropZone(e: React.DragEvent) {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setOsDrag(false);
    const target = dropTarget;
    setDropTarget(null);
    const entries = await entriesFromDataTransfer(e.dataTransfer);
    enqueueFiles(entries, target ?? folderId);
  }

  function startInternalDrag(e: React.DragEvent, row: Row) {
    if (!canWrite) return;
    const list = selected.has(row.key) ? selectedRows : [row];
    if (!selected.has(row.key)) setSelected(new Set([row.key]));
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(split(list)));
    e.dataTransfer.effectAllowed = "move";
  }

  function canDropInto(e: React.DragEvent, targetId: string | null): boolean {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes("Files")) return canWrite;
    if (!types.includes(DRAG_TYPE)) return false;
    if (targetId === folderId) return false;
    if (targetId && selected.has(`d:${targetId}`)) return false;
    return true;
  }

  async function dropInto(e: React.DragEvent, targetId: string | null, targetName: string) {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    resetOsDrag();
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      enqueueFiles(await entriesFromDataTransfer(e.dataTransfer), targetId);
      return;
    }
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    const ids = JSON.parse(raw) as { folderIds: string[]; documentIds: string[] };
    if (targetId) {
      for (const id of ids.folderIds) {
        if (collectDescendantIds(tree, id).has(targetId)) {
          toast.error("Impossible de déplacer un dossier dans lui-même.");
          return;
        }
      }
    }
    await moveTo(ids, targetId, targetName);
  }

  function dropProps(targetId: string | null, targetName: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!canDropInto(e, targetId)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = Array.from(e.dataTransfer.types).includes("Files") ? "copy" : "move";
        setDropTarget(targetId ?? "__root__");
      },
      onDragLeave: () => setDropTarget((t) => (t === (targetId ?? "__root__") ? null : t)),
      onDrop: (e: React.DragEvent) => void dropInto(e, targetId, targetName),
    };
  }

  // --- Rendu ----------------------------------------------------------------------

  const empty = rows.length === 0;
  const currentName = breadcrumb.at(-1)?.name ?? workspace.name;

  return (
    <div
      className="relative min-h-[50vh]"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={(e) => {
        if (isFileDrag(e) && canWrite) e.preventDefault();
      }}
      onDrop={(e) => void onDropZone(e)}
    >
      {/* Barre d'outils */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 flex min-h-12 flex-wrap items-center gap-2 border-b border-transparent bg-canvas/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        {selectedRows.length > 0 ? (
          <div className="animate-fade-up flex w-full flex-wrap items-center gap-1.5 rounded-xl bg-slate-900 px-2 py-1.5 text-white shadow-lg">
            <button type="button" onClick={() => setSelected(new Set())} aria-label="Désélectionner" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <span className="mr-auto pl-1 text-sm font-medium">
              {selectedRows.length} sélectionné{selectedRows.length > 1 ? "s" : ""}
            </span>
            <ToolbarButton icon={Download} label="Télécharger" onClick={() => void download(selectedRows)} />
            {canShare && selectedRows.length === 1 && <ToolbarButton icon={Share2} label="Partager" onClick={() => shareRow(selectedRows[0])} />}
            {canWrite && <ToolbarButton icon={FolderInput} label="Déplacer" onClick={() => setMoveIds(split(selectedRows))} />}
            {canWrite && selectedRows.length === 1 && (
              <ToolbarButton
                icon={Pencil}
                label="Renommer"
                onClick={() => {
                  const r = selectedRows[0];
                  setNameError(null);
                  setNameDialog({ mode: "rename", kind: r.kind, id: r.id, name: r.name });
                }}
              />
            )}
            {canWrite && <ToolbarButton icon={Trash2} label="Corbeille" onClick={() => trash(selectedRows)} danger />}
          </div>
        ) : (
          <>
            <nav aria-label="Fil d'Ariane" className="flex min-w-0 flex-1 items-center gap-0.5 text-sm">
              <Crumb href={folderHref(workspace.id, null)} active={!folderId} drop={dropProps(null, workspace.name)} highlighted={dropTarget === "__root__"}>
                {workspace.name}
              </Crumb>
              {breadcrumb.map((c, i) => (
                <span key={c.id} className="flex min-w-0 items-center gap-0.5">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  <Crumb
                    href={folderHref(workspace.id, c.id)}
                    active={i === breadcrumb.length - 1}
                    drop={i === breadcrumb.length - 1 ? undefined : dropProps(c.id, c.name)}
                    highlighted={dropTarget === c.id}
                  >
                    {c.name}
                  </Crumb>
                </span>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              {canShare && (
                <Button variant="outline" size="sm" className="h-9" onClick={shareCurrent}>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Partager</span>
                </Button>
              )}
              {canWrite && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button size="sm" className="h-9">
                      <Plus className="h-4 w-4" />
                      Nouveau
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" sideOffset={6} className="animate-menu-in z-50 min-w-56 rounded-xl border border-border bg-popover p-1 shadow-lg">
                      <MenuItem icon={FolderPlus} label="Nouveau dossier" onSelect={() => { setNameError(null); setNameDialog({ mode: "new" }); }} />
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <MenuItem icon={Upload} label="Importer des fichiers" onSelect={() => fileInput.current?.click()} />
                      <MenuItem icon={FolderUp} label="Importer un dossier" onSelect={() => folderInput.current?.click()} />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Trier">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={6} className="animate-menu-in z-50 min-w-48 rounded-xl border border-border bg-popover p-1 shadow-lg">
                    {(
                      [
                        ["name", "Nom"],
                        ["modified", "Date de modification"],
                        ["size", "Taille"],
                      ] as const
                    ).map(([id, label]) => (
                      <MenuItem
                        key={id}
                        icon={sort === id ? Check : undefined}
                        label={label}
                        onSelect={() => {
                          if (sort === id) setDesc((d) => !d);
                          else {
                            setSort(id);
                            setDesc(id !== "name");
                          }
                        }}
                      />
                    ))}
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <MenuItem icon={ArrowDownAZ} label={desc ? "Ordre décroissant" : "Ordre croissant"} onSelect={() => setDesc((d) => !d)} />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <div className="hidden rounded-lg bg-white p-0.5 ring-1 ring-border sm:flex">
                {(
                  [
                    ["list", List, "Vue liste"],
                    ["grid", LayoutGrid, "Vue grille"],
                  ] as const
                ).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={label}
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      view === id ? "bg-canvas text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contenu */}
      {empty ? (
        <EmptyFolder
          canWrite={canWrite}
          name={currentName}
          onUpload={() => fileInput.current?.click()}
          onNewFolder={() => {
            setNameError(null);
            setNameDialog({ mode: "new" });
          }}
          onContextMenu={backgroundMenu}
        />
      ) : view === "list" ? (
        <div
          className="overflow-hidden rounded-2xl border border-border bg-white"
          onContextMenu={backgroundMenu}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(new Set());
          }}
        >
          <div className="hidden grid-cols-[minmax(0,1fr)_160px_96px_44px] items-center gap-3 border-b border-border bg-slate-50/70 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
            <span className="pl-11">Nom</span>
            <span>Modifié</span>
            <span className="text-right">Taille</span>
            <span />
          </div>
          <ul role="listbox" aria-multiselectable="true" aria-label={`Contenu de ${currentName}`}>
            {rows.map((row, index) => {
              const isSelected = selected.has(row.key);
              const isDrop = row.kind === "folder" && dropTarget === row.id;
              const by = row.kind === "file" ? people[row.file.file_updated_by ?? ""] : undefined;
              const hiddenFromClient = clientSpace && row.kind === "file" && !row.file.is_visible_to_client;
              const shared = row.kind === "folder" ? row.folder.shared : row.file.shared;
              return (
                <li
                  key={row.key}
                  id={`row-${row.key}`}
                  role="option"
                  aria-selected={isSelected}
                  draggable={canWrite}
                  onDragStart={(e) => startInternalDrag(e, row)}
                  {...(row.kind === "folder" ? dropProps(row.id, row.name) : {})}
                  onClick={(e) => clickRow(e, index, row)}
                  onDoubleClick={() => openRow(row)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isSelected) {
                      setSelected(new Set([row.key]));
                      setAnchor(index);
                    }
                    setMenu({ x: e.clientX, y: e.clientY, items: menuFor(row) });
                  }}
                  className={cn(
                    "group grid cursor-default select-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 px-2 py-1.5 transition-colors last:border-b-0 sm:px-4 md:grid-cols-[minmax(0,1fr)_160px_96px_44px]",
                    isSelected ? "bg-primary-subtle" : "hover:bg-slate-50",
                    isDrop && "bg-sky-50 ring-2 ring-inset ring-sky-400"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Sélectionner ${row.name}`}
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(row, index);
                      }}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                        selected.size > 0 && "sm:opacity-100"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <ItemIcon kind={row.kind} name={row.name} mime={row.kind === "file" ? row.file.file_type : null} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.metaKey || e.ctrlKey || e.shiftKey) clickRow(e, index, row);
                          else openRow(row);
                        }}
                        className="block max-w-full truncate text-left text-sm font-medium hover:text-primary hover:underline hover:underline-offset-2"
                        title={row.name}
                      >
                        {row.name}
                      </button>
                      <p suppressHydrationWarning className="flex items-center gap-1.5 truncate text-xs text-muted-foreground md:hidden">
                        {row.kind === "folder"
                          ? `${row.folder.files + row.folder.folders} élément${row.folder.files + row.folder.folders > 1 ? "s" : ""}`
                          : `${formatBytes(row.size)} · ${formatRelativeTime(row.modified)}`}
                      </p>
                    </div>
                    {shared && (
                      <span title="Partagé par un lien" className="shrink-0 rounded-md bg-sky-50 p-1 text-sky-600">
                        <Link2 className="h-3 w-3" />
                      </span>
                    )}
                    {hiddenFromClient && (
                      <span title="Masqué du portail client" className="shrink-0 rounded-md bg-slate-100 p-1 text-slate-500">
                        <EyeOff className="h-3 w-3" />
                      </span>
                    )}
                    {row.kind === "file" && row.file.version > 1 && (
                      <span className="hidden shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 sm:inline" title={`Version ${row.file.version}`}>
                        v{row.file.version}
                      </span>
                    )}
                  </div>
                  <span suppressHydrationWarning className="hidden truncate text-xs text-muted-foreground md:block">
                    {formatRelativeTime(row.modified)}
                    {by ? ` · ${by}` : ""}
                  </span>
                  <span className="hidden text-right text-xs tabular-nums text-muted-foreground md:block">
                    {row.kind === "folder"
                      ? `${row.folder.files + row.folder.folders} élément${row.folder.files + row.folder.folders > 1 ? "s" : ""}`
                      : formatBytes(row.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Actions pour ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      if (!isSelected) {
                        setSelected(new Set([row.key]));
                        setAnchor(index);
                      }
                      setMenu({ x: rect.right - 210, y: rect.bottom + 4, items: menuFor(row) });
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="justify-self-end rounded-lg p-1.5 text-muted-foreground opacity-100 transition-opacity hover:bg-white hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-aria-selected:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          onContextMenu={backgroundMenu}
          aria-label={`Contenu de ${currentName}`}
        >
          {rows.map((row, index) => {
            const isSelected = selected.has(row.key);
            const isDrop = row.kind === "folder" && dropTarget === row.id;
            const thumb = row.kind === "file" ? thumbs[row.id] : undefined;
            return (
              <li
                key={row.key}
                id={`row-${row.key}`}
                draggable={canWrite}
                onDragStart={(e) => startInternalDrag(e, row)}
                {...(row.kind === "folder" ? dropProps(row.id, row.name) : {})}
                onClick={(e) => clickRow(e, index, row)}
                onDoubleClick={() => openRow(row)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isSelected) setSelected(new Set([row.key]));
                  setMenu({ x: e.clientX, y: e.clientY, items: menuFor(row) });
                }}
                className={cn(
                  "group relative cursor-default select-none overflow-hidden rounded-2xl border bg-white transition-all",
                  isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-slate-300 hover:shadow-sm",
                  isDrop && "border-sky-400 ring-2 ring-sky-300"
                )}
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-slate-50">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <ItemIcon kind={row.kind} name={row.name} mime={row.kind === "file" ? row.file.file_type : null} size="lg" />
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={row.name}>{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.kind === "folder"
                        ? `${row.folder.files + row.folder.folders} élément${row.folder.files + row.folder.folders > 1 ? "s" : ""}`
                        : `${fileKindLabel(row.name, row.file.file_type)} · ${formatBytes(row.size)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Actions pour ${row.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      if (!isSelected) setSelected(new Set([row.key]));
                      setMenu({ x: rect.right - 210, y: rect.bottom + 4, items: menuFor(row) });
                    }}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
                <span
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Sélectionner ${row.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRow(row, index);
                  }}
                  className={cn(
                    "absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border shadow-sm transition-opacity",
                    isSelected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white opacity-0 group-hover:opacity-100",
                    selected.size > 0 && "opacity-100"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Dépôt depuis l'ordinateur */}
      {osDrag && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center rounded-2xl border-2 border-dashed border-primary bg-primary-subtle/80 pt-24 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-5 text-center shadow-xl">
            <UploadCloud className="h-8 w-8 text-primary" />
            <p className="text-sm font-semibold">Déposez pour importer</p>
            <p className="text-xs text-muted-foreground">
              dans « {dropTarget && dropTarget !== "__root__" ? folders.find((f) => f.id === dropTarget)?.name ?? currentName : currentName} »
            </p>
          </div>
        </div>
      )}

      {(pending || zipping) && (
        <div className="fixed bottom-4 left-1/2 z-[105] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {zipping ?? "Un instant…"}
        </div>
      )}

      {/* Champs de fichiers */}
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          enqueueFiles(entriesFromInput(e.target.files));
          e.target.value = "";
        }}
      />
      <input
        ref={folderInput}
        type="file"
        hidden
        // @ts-expect-error attribut non standard, pris en charge par tous les navigateurs récents
        webkitdirectory=""
        onChange={(e) => {
          enqueueFiles(entriesFromInput(e.target.files));
          e.target.value = "";
        }}
      />
      <input
        ref={versionInput}
        type="file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          const target = versionTarget.current;
          e.target.value = "";
          if (!file || !target) return;
          uploads.enqueue(
            { workspaceId: workspace.id, folderId, existing: [], replace: { id: target.id, name: target.name } },
            [{ file, relativeDir: "" }]
          );
        }}
      />

      <ContextMenu state={menu} onClose={() => setMenu(null)} />

      <NameDialog
        key={nameDialog ? (nameDialog.mode === "new" ? "new" : nameDialog.id) : "closed"}
        open={nameDialog !== null}
        onOpenChange={(o) => !o && setNameDialog(null)}
        title={nameDialog?.mode === "rename" ? `Renommer « ${nameDialog.name} »` : "Nouveau dossier"}
        label={nameDialog?.mode === "rename" ? "Nouveau nom" : "Nom du dossier"}
        initialValue={nameDialog?.mode === "rename" ? nameDialog.name : ""}
        submitLabel={nameDialog?.mode === "rename" ? "Renommer" : "Créer"}
        busy={pending}
        error={nameError}
        onSubmit={(name) => {
          const d = nameDialog;
          if (!d) return;
          start(async () => {
            const r =
              d.mode === "new"
                ? await createFolderAction(workspace.id, folderId, name)
                : await renameItemAction(d.kind, d.id, name);
            if (!r.ok) {
              setNameError(r.message);
              return;
            }
            setNameDialog(null);
            toast.show(d.mode === "new" ? `Dossier « ${name} » créé.` : "Renommé.");
          });
        }}
      />

      <MoveDialog
        open={moveIds !== null}
        onOpenChange={(o) => !o && setMoveIds(null)}
        spaceName={workspace.name}
        tree={tree}
        movingFolderIds={moveIds?.folderIds ?? []}
        currentFolderId={folderId}
        count={(moveIds?.folderIds.length ?? 0) + (moveIds?.documentIds.length ?? 0)}
        onConfirm={async (target) => {
          if (!moveIds) return;
          const name = target ? tree.find((f) => f.id === target)?.name ?? "dossier" : workspace.name;
          if (await moveTo(moveIds, target, name)) setMoveIds(null);
        }}
      />

      <ShareDialog open={share !== null} onOpenChange={(o) => !o && setShare(null)} target={share} canManage={canShare} />

      {previewIndex >= 0 && (
        <FilePreview
          files={previewFiles}
          index={previewIndex}
          onIndexChange={(i) => setPreviewId(previewFiles[i]?.id ?? null)}
          onClose={() => {
            setPreviewId(null);
            if (window.location.search.includes("apercu=")) {
              router.replace(folderHref(workspace.id, folderId), { scroll: false });
            }
          }}
          getUrl={(id) => getFileUrlAction(id, { download: false })}
          onDownload={(f) => {
            const row = rows.find((r) => r.kind === "file" && r.id === f.id);
            if (row) void download([row]);
          }}
          onShare={canShare ? (f) => {
            const row = rows.find((r) => r.kind === "file" && r.id === f.id);
            if (row) shareRow(row);
          } : undefined}
          onDetails={(f) => {
            setPreviewId(null);
            setDetailsId(f.id);
          }}
        />
      )}

      {detailsFile && (
        <FileDetailsPanel
          file={detailsFile}
          location={[workspace.name, locationLabel].filter(Boolean).join(" › ")}
          people={people}
          canWrite={canWrite}
          onClose={() => setDetailsId(null)}
          onShare={canShare ? () => shareRow({ key: `f:${detailsFile.id}`, kind: "file", id: detailsFile.id, name: detailsFile.name, modified: detailsFile.file_updated_at, size: detailsFile.file_size ?? 0, file: detailsFile }) : undefined}
          onNewVersion={() => {
            versionTarget.current = detailsFile;
            versionInput.current?.click();
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------

function Crumb({
  href,
  active,
  children,
  drop,
  highlighted,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  drop?: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
  highlighted?: boolean;
}) {
  return (
    <Link
      href={href}
      {...drop}
      aria-current={active ? "page" : undefined}
      className={cn(
        "max-w-[16rem] truncate rounded-lg px-2 py-1 transition-colors",
        active ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-white hover:text-foreground",
        highlighted && "bg-sky-100 text-sky-800 ring-2 ring-sky-300"
      )}
    >
      {children}
    </Link>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Download;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        danger ? "text-red-300 hover:bg-red-500/20 hover:text-red-200" : "text-white/85 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onSelect,
}: {
  icon?: typeof Download;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent"
    >
      <span className="flex h-4 w-4 items-center justify-center">{Icon && <Icon className="h-4 w-4 opacity-70" />}</span>
      {label}
    </DropdownMenu.Item>
  );
}

function EmptyFolder({
  canWrite,
  name,
  onUpload,
  onNewFolder,
  onContextMenu,
}: {
  canWrite: boolean;
  name: string;
  onUpload: () => void;
  onNewFolder: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onContextMenu={onContextMenu}
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
        <UploadCloud className="h-7 w-7" />
      </span>
      <p className="mt-4 text-base font-semibold">« {name} » est vide</p>
      {canWrite ? (
        <>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Glissez ici des fichiers ou des dossiers entiers depuis votre ordinateur.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={onUpload}>
              <Upload className="h-4 w-4" />
              Importer des fichiers
            </Button>
            <Button variant="outline" onClick={onNewFolder}>
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Aucun fichier pour l&apos;instant.</p>
      )}
    </div>
  );
}
