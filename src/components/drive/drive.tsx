"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type MouseEvent,
} from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudUpload,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  FolderClosed,
  FolderPlus,
  House,
  LoaderCircle,
  Lock,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileIcon } from "@/components/documents/file-icon";
import { DocumentStateBadge } from "@/components/documents/document-state-badge";
import { DocumentEditDialog } from "@/components/documents/document-edit-dialog";
import {
  ContextMenu,
  type ContextMenuEntry,
  type ContextMenuState,
} from "@/components/drive/context-menu";
import { MoveDialog } from "@/components/drive/move-dialog";
import { NameDialog } from "@/components/drive/name-dialog";
import {
  deleteDocumentAction,
  getDocumentDownloadUrl,
  setDocumentDownloadAction,
  setDocumentVisibilityAction,
  uploadDocumentAction,
} from "@/lib/actions/documents";
import {
  createFolderAction,
  deleteFolderAction,
  duplicateDocumentAction,
  moveDocumentAction,
  moveFolderAction,
  renameFolderAction,
} from "@/lib/actions/folders";
import { deriveDocumentState } from "@/lib/document-state";
import { buildBreadcrumb, collectDescendantIds } from "@/lib/folder-tree";
import { FILE_ACCEPT_ATTRIBUTE, formatBytes, validateFile } from "@/lib/files";
import { formatStorage } from "@/lib/plans";
import { cn, formatDate } from "@/lib/utils";
import type { Document, DocumentDecision, Folder } from "@/lib/types/database";

const DRAG_MIME = "application/docalio-item";

interface UploadItem {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

interface DriveProps {
  documents: Document[];
  folders: Folder[];
  workspaceId: string;
  decisions: Record<string, DocumentDecision>;
  viewedDocumentIds: string[];
  downloadedDocumentIds: string[];
  maxFileBytes: number;
}

type Selection = Set<string>; // clés "f:<id>" (dossier) ou "d:<id>" (document)
const fKey = (id: string) => `f:${id}`;
const dKey = (id: string) => `d:${id}`;

// =============================================================================
// Tuile dossier
// =============================================================================
function FolderTile({
  folder,
  count,
  view,
  selected,
  isDropTarget,
  onOpen,
  onToggleSelect,
  onMenu,
  onDragStart,
  onDragEnterFolder,
  onDragLeaveFolder,
  onDropOnFolder,
}: {
  folder: Folder;
  count: number;
  view: "grid" | "list";
  selected: boolean;
  isDropTarget: boolean;
  onOpen: () => void;
  onToggleSelect: (additive: boolean) => void;
  onMenu: (e: MouseEvent) => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnterFolder: () => void;
  onDragLeaveFolder: () => void;
  onDropOnFolder: () => void;
}) {
  const base = cn(
    "group/tile relative cursor-pointer select-none rounded-xl border bg-card transition-all",
    selected
      ? "border-primary ring-1 ring-primary"
      : "border-border hover:border-ring/50",
    isDropTarget && "border-primary bg-primary-subtle ring-1 ring-primary"
  );

  const handleDrag = {
    draggable: true,
    onDragStart,
    onDragOver: (e: DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_MIME)) {
        e.preventDefault();
        onDragEnterFolder();
      }
    },
    onDragLeave: onDragLeaveFolder,
    onDrop: (e: DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_MIME)) {
        e.preventDefault();
        e.stopPropagation();
        onDropOnFolder();
      }
    },
  };

  if (view === "list") {
    return (
      <div
        {...handleDrag}
        onClick={(e) => (e.metaKey || e.ctrlKey ? onToggleSelect(true) : onOpen())}
        onDoubleClick={onOpen}
        onContextMenu={onMenu}
        className={cn(base, "flex items-center gap-3 px-3 py-2.5")}
      >
        <FolderClosed className="h-5 w-5 shrink-0 text-primary" fill="currentColor" fillOpacity={0.12} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{folder.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count} élément{count > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onMenu(e); }}
          aria-label="Actions"
          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover/tile:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...handleDrag}
      onClick={(e) => (e.metaKey || e.ctrlKey ? onToggleSelect(true) : onOpen())}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      className={cn(base, "flex items-center gap-3 p-3.5")}
    >
      <FolderClosed className="h-9 w-9 shrink-0 text-primary" fill="currentColor" fillOpacity={0.12} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={folder.name}>{folder.name}</p>
        <p className="text-xs text-muted-foreground">
          {count} élément{count > 1 ? "s" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onMenu(e); }}
        aria-label="Actions"
        className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover/tile:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}

// =============================================================================
// Tuile fichier (avec bascules produit : visibilité client + téléchargement)
// =============================================================================
function FileTile({
  doc,
  decision,
  viewed,
  downloaded,
  view,
  selected,
  onToggleSelect,
  onMenu,
  onDownload,
  onDragStart,
}: {
  doc: Document;
  decision: DocumentDecision | null;
  viewed: boolean;
  downloaded: boolean;
  view: "grid" | "list";
  selected: boolean;
  onToggleSelect: (additive: boolean) => void;
  onMenu: (e: MouseEvent) => void;
  onDownload: () => void;
  onDragStart: (e: DragEvent) => void;
}) {
  const [optimisticVisible, setOptimisticVisible] = useState<boolean | null>(null);
  const [optimisticAllow, setOptimisticAllow] = useState<boolean | null>(null);
  const [visPending, startVisibility] = useTransition();
  const [dlPending, startDownloadToggle] = useTransition();
  const [downloading, setDownloading] = useState(false);

  // Réinitialise l'optimiste si la valeur serveur change (pattern « no effect »).
  const [prevVisible, setPrevVisible] = useState(doc.is_visible_to_client);
  if (prevVisible !== doc.is_visible_to_client) {
    setPrevVisible(doc.is_visible_to_client);
    setOptimisticVisible(null);
  }
  const [prevAllow, setPrevAllow] = useState(doc.allow_download);
  if (prevAllow !== doc.allow_download) {
    setPrevAllow(doc.allow_download);
    setOptimisticAllow(null);
  }

  const visible = optimisticVisible ?? doc.is_visible_to_client;
  const allowDownload = optimisticAllow ?? doc.allow_download;
  const state = deriveDocumentState({
    isVisible: visible,
    decision: decision?.decision ?? null,
    viewed,
    downloaded,
  });

  function toggleVisibility(e: MouseEvent) {
    e.stopPropagation();
    const next = !visible;
    setOptimisticVisible(next);
    startVisibility(async () => {
      const r = await setDocumentVisibilityAction(doc.id, next);
      if (!r.ok) setOptimisticVisible(null);
    });
  }
  function toggleDownload(e: MouseEvent) {
    e.stopPropagation();
    const next = !allowDownload;
    setOptimisticAllow(next);
    startDownloadToggle(async () => {
      const r = await setDocumentDownloadAction(doc.id, next);
      if (!r.ok) setOptimisticAllow(null);
    });
  }
  async function download(e: MouseEvent) {
    e.stopPropagation();
    setDownloading(true);
    const r = await getDocumentDownloadUrl(doc.id);
    setDownloading(false);
    if (r.ok) window.location.assign(r.url);
    onDownload();
  }

  const visibilityToggle = (
    <button
      type="button"
      onClick={toggleVisibility}
      disabled={visPending}
      title={visible ? "Visible client — cliquer pour repasser en privé" : "Privé — cliquer pour partager"}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition active:scale-[0.97]",
        visible
          ? "border-primary/25 bg-primary-subtle text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {visPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {visible ? "Visible" : "Privé"}
    </button>
  );

  const downloadToggle = visible && (
    <button
      type="button"
      onClick={toggleDownload}
      disabled={dlPending}
      title={allowDownload ? "Téléchargement autorisé" : "Lecture seule"}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition active:scale-[0.97]",
        allowDownload
          ? "border-border bg-card text-foreground/70"
          : "border-warning/40 bg-warning/10 text-warning"
      )}
    >
      {dlPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : allowDownload ? <Download className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
    </button>
  );

  const menuBtn = (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onMenu(e); }}
      aria-label="Actions"
      className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );

  const base = cn(
    "group/tile relative cursor-default select-none rounded-xl border bg-card transition-all",
    selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-ring/50"
  );

  if (view === "list") {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onClick={(e) => onToggleSelect(e.metaKey || e.ctrlKey)}
        onDoubleClick={download}
        onContextMenu={onMenu}
        className={cn(base, "flex items-center gap-3 px-3 py-2.5")}
      >
        <FileIcon filePath={doc.file_path} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium" title={doc.title}>{doc.title}</p>
            <DocumentStateBadge state={state} />
          </div>
          <p className="text-xs text-muted-foreground">{formatBytes(doc.file_size)} · {formatDate(doc.created_at)}</p>
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">{visibilityToggle}{downloadToggle}</div>
        {downloading ? <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" /> : menuBtn}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={(e) => onToggleSelect(e.metaKey || e.ctrlKey)}
      onDoubleClick={download}
      onContextMenu={onMenu}
      className={cn(base, "flex flex-col")}
    >
      <div className="flex items-start gap-3 p-3.5">
        <FileIcon filePath={doc.file_path} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug" title={doc.title}>{doc.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(doc.file_size)} · {formatDate(doc.created_at)}</p>
        </div>
        {menuBtn}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <DocumentStateBadge state={state} />
        <div className="flex items-center gap-1.5">{visibilityToggle}{downloadToggle}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Drive
// =============================================================================
export function Drive({
  documents,
  folders,
  workspaceId,
  decisions,
  viewedDocumentIds,
  downloadedDocumentIds,
  maxFileBytes,
}: DriveProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const dragKeys = useRef<string[]>([]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(new Set());
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [extDragging, setExtDragging] = useState(false);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [opPending, startOp] = useTransition();

  // Dialogs
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [moveState, setMoveState] = useState<
    | { kind: "folder"; id: string; currentParent: string | null }
    | { kind: "docs"; ids: string[]; currentParent: string | null }
    | null
  >(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const viewedSet = useMemo(() => new Set(viewedDocumentIds), [viewedDocumentIds]);
  const downloadedSet = useMemo(() => new Set(downloadedDocumentIds), [downloadedDocumentIds]);

  // Comptage des éléments par dossier (sous-dossiers directs + documents directs)
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of folders) {
      if (f.parent_id) counts.set(f.parent_id, (counts.get(f.parent_id) ?? 0) + 1);
    }
    for (const d of documents) {
      if (d.folder_id) counts.set(d.folder_id, (counts.get(d.folder_id) ?? 0) + 1);
    }
    return counts;
  }, [folders, documents]);

  const breadcrumb = useMemo(
    () => buildBreadcrumb(folders, currentFolderId),
    [folders, currentFolderId]
  );

  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  const visibleFolders = useMemo(() => {
    const list = searching
      ? folders.filter((f) => f.name.toLowerCase().includes(q))
      : folders.filter((f) => (f.parent_id ?? null) === currentFolderId);
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, currentFolderId, searching, q]);

  const visibleDocs = useMemo(() => {
    const list = searching
      ? documents.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            (d.category ?? "").toLowerCase().includes(q) ||
            (d.description ?? "").toLowerCase().includes(q)
        )
      : documents.filter((d) => (d.folder_id ?? null) === currentFolderId);
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [documents, currentFolderId, searching, q]);

  const isEmptyHere = visibleFolders.length === 0 && visibleDocs.length === 0;

  // ---------------------------------------------------------------------------
  // Sélection
  // ---------------------------------------------------------------------------
  const clearSelection = useCallback(() => setSelection(new Set()), []);
  const toggleSelect = useCallback((key: string, additive: boolean) => {
    setSelection((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();
      if (additive && prev.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Upload (dans le dossier courant)
  // ---------------------------------------------------------------------------
  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const queue: { id: string; file: File }[] = [];
      for (const file of files) {
        const id = crypto.randomUUID();
        const err = validateFile(file, maxFileBytes);
        if (err) {
          setUploads((u) => [...u, { id, name: file.name, status: "error", message: err }]);
        } else {
          queue.push({ id, file });
          setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
        }
      }
      for (const { id, file } of queue) {
        const fd = new FormData();
        fd.set("workspace_id", workspaceId);
        if (currentFolderId) fd.set("folder_id", currentFolderId);
        fd.set("file", file);
        let result: { ok: boolean; message?: string } | null = null;
        try {
          result = await uploadDocumentAction(null, fd);
        } catch {
          result = { ok: false, message: "L'envoi a échoué. Réessayez." };
        }
        setUploads((u) =>
          u.map((it) =>
            it.id === id
              ? { ...it, status: result?.ok ? "done" : "error", message: result?.ok ? undefined : result?.message }
              : it
          )
        );
        if (result?.ok) {
          setTimeout(() => setUploads((u) => u.filter((it) => it.id !== id)), 4000);
        }
      }
    },
    [maxFileBytes, workspaceId, currentFolderId]
  );

  // ---------------------------------------------------------------------------
  // Drag & drop racine : fichiers externes (upload) vs déplacement interne
  // ---------------------------------------------------------------------------
  function onRootDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setExtDragging(false);
    if (e.dataTransfer.types.includes("Files")) {
      handleFiles(Array.from(e.dataTransfer.files ?? []));
    }
  }
  function onRootDragEnter(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setExtDragging(true);
  }
  function onRootDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setExtDragging(false);
  }

  function startDrag(key: string, e: DragEvent) {
    // Si l'élément n'est pas dans la sélection, on déplace juste celui-ci.
    const keys = selection.has(key) ? [...selection] : [key];
    dragKeys.current = keys;
    e.dataTransfer.setData(DRAG_MIME, "1");
    e.dataTransfer.effectAllowed = "move";
  }

  function moveKeysTo(keys: string[], targetFolderId: string | null) {
    setOpError(null);
    startOp(async () => {
      for (const key of keys) {
        const id = key.slice(2);
        const r = key.startsWith("f:")
          ? await moveFolderAction(id, targetFolderId)
          : await moveDocumentAction(id, targetFolderId);
        if (!r.ok) {
          setOpError(r.message ?? "Déplacement impossible.");
          break;
        }
      }
      clearSelection();
    });
  }

  function dropOnFolder(folderId: string) {
    setDropFolderId(null);
    const keys = dragKeys.current.filter((k) => k !== fKey(folderId));
    if (keys.length) moveKeysTo(keys, folderId);
    dragKeys.current = [];
  }

  // ---------------------------------------------------------------------------
  // Opérations (créer / renommer / supprimer / dupliquer)
  // ---------------------------------------------------------------------------
  function createFolder(name: string) {
    setOpError(null);
    startOp(async () => {
      const r = await createFolderAction(workspaceId, currentFolderId, name);
      if (r.ok) setNewFolderOpen(false);
      else setOpError(r.message ?? "Création impossible.");
    });
  }
  function doRenameFolder(name: string) {
    if (!renameFolder) return;
    startOp(async () => {
      const r = await renameFolderAction(renameFolder.id, name);
      if (r.ok) setRenameFolder(null);
      else setOpError(r.message ?? "Renommage impossible.");
    });
  }
  function doMove(targetFolderId: string | null) {
    if (!moveState) return;
    const keys =
      moveState.kind === "folder"
        ? [fKey(moveState.id)]
        : moveState.ids.map(dKey);
    moveKeysTo(keys, targetFolderId);
    setMoveState(null);
  }
  function deleteFolder(folder: Folder) {
    setConfirm({
      title: "Supprimer ce dossier ?",
      description: `« ${folder.name} » et tout son contenu (sous-dossiers et documents) seront définitivement supprimés.`,
      confirmLabel: "Supprimer le dossier",
      onConfirm: () =>
        startOp(async () => {
          await deleteFolderAction(folder.id);
          setConfirm(null);
        }),
    });
  }
  function deleteDoc(doc: Document) {
    setConfirm({
      title: "Supprimer ce document ?",
      description: `« ${doc.title} » et son fichier seront définitivement supprimés.`,
      confirmLabel: "Supprimer le document",
      onConfirm: () =>
        startOp(async () => {
          const fd = new FormData();
          fd.set("document_id", doc.id);
          await deleteDocumentAction(fd);
          setConfirm(null);
        }),
    });
  }
  function deleteSelection() {
    const docIds = [...selection].filter((k) => k.startsWith("d:")).map((k) => k.slice(2));
    const folderIds = [...selection].filter((k) => k.startsWith("f:")).map((k) => k.slice(2));
    setConfirm({
      title: `Supprimer ${selection.size} élément${selection.size > 1 ? "s" : ""} ?`,
      description: "Les dossiers supprimés emportent tout leur contenu. Action irréversible.",
      confirmLabel: "Supprimer",
      onConfirm: () =>
        startOp(async () => {
          for (const id of folderIds) await deleteFolderAction(id);
          for (const id of docIds) {
            const fd = new FormData();
            fd.set("document_id", id);
            await deleteDocumentAction(fd);
          }
          clearSelection();
          setConfirm(null);
        }),
    });
  }
  function duplicateDoc(doc: Document) {
    setOpError(null);
    startOp(async () => {
      const r = await duplicateDocumentAction(doc.id);
      if (!r.ok) setOpError(r.message ?? "Duplication impossible.");
    });
  }

  // Menus contextuels
  function openFolderMenu(folder: Folder, e: MouseEvent) {
    e.preventDefault();
    const items: ContextMenuEntry[] = [
      { label: "Ouvrir", icon: FolderClosed, onSelect: () => { setCurrentFolderId(folder.id); clearSelection(); } },
      { label: "Renommer", icon: Pencil, onSelect: () => setRenameFolder(folder) },
      { label: "Déplacer vers…", icon: Upload, onSelect: () => setMoveState({ kind: "folder", id: folder.id, currentParent: folder.parent_id }) },
      { type: "separator" },
      { label: "Supprimer", icon: Trash2, destructive: true, onSelect: () => deleteFolder(folder) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }
  function openDocMenu(doc: Document, e: MouseEvent) {
    e.preventDefault();
    const items: ContextMenuEntry[] = [
      { label: "Télécharger", icon: Download, onSelect: async () => { const r = await getDocumentDownloadUrl(doc.id); if (r.ok) window.location.assign(r.url); } },
      { label: "Renommer", icon: Pencil, onSelect: () => setEditDoc(doc) },
      { label: "Dupliquer", icon: Copy, onSelect: () => duplicateDoc(doc) },
      { label: "Déplacer vers…", icon: Upload, onSelect: () => setMoveState({ kind: "docs", ids: [doc.id], currentParent: doc.folder_id }) },
      { type: "separator" },
      { label: "Supprimer", icon: Trash2, destructive: true, onSelect: () => deleteDoc(doc) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  const browse = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={FILE_ACCEPT_ATTRIBUTE}
      className="sr-only"
      onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
    />
  );

  // Dossiers exclus du sélecteur de destination (anti-cycle).
  const moveExcluded = useMemo(() => {
    if (moveState?.kind !== "folder") return new Set<string>();
    return collectDescendantIds(folders, moveState.id);
  }, [moveState, folders]);

  return (
    <div
      className="relative space-y-4"
      onDragEnter={onRootDragEnter}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      onDragLeave={onRootDragLeave}
      onDrop={onRootDrop}
    >
      {browse}

      {/* Voile de dépôt externe */}
      {extDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary-subtle/80 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 text-primary">
            <CloudUpload className="h-8 w-8" />
            <p className="text-sm font-semibold">
              Déposer dans {currentFolderId ? "ce dossier" : "le Drive"}
            </p>
          </div>
        </div>
      )}

      {/* Barre supérieure : fil d'Ariane + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex min-w-0 items-center gap-1 text-sm" aria-label="Fil d'Ariane">
          <button
            type="button"
            onClick={() => { setCurrentFolderId(null); clearSelection(); }}
            onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MIME)) e.preventDefault(); }}
            onDrop={(e) => { if (e.dataTransfer.types.includes(DRAG_MIME)) { e.preventDefault(); const keys = dragKeys.current; if (keys.length) moveKeysTo(keys, null); dragKeys.current = []; } }}
            className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors hover:bg-accent", !currentFolderId && "text-foreground", currentFolderId && "text-muted-foreground")}
          >
            <House className="h-4 w-4" />
            Documents
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex min-w-0 items-center">
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              <button
                type="button"
                onClick={() => { setCurrentFolderId(crumb.id); clearSelection(); }}
                onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_MIME)) e.preventDefault(); }}
                onDrop={(e) => { if (e.dataTransfer.types.includes(DRAG_MIME)) { e.preventDefault(); const keys = dragKeys.current.filter((k) => k !== fKey(crumb.id)); if (keys.length) moveKeysTo(keys, crumb.id); dragKeys.current = []; } }}
                className={cn("truncate rounded-md px-2 py-1 font-medium transition-colors hover:bg-accent", i === breadcrumb.length - 1 ? "text-foreground" : "text-muted-foreground")}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau dossier</span>
          </Button>
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importer
          </Button>
        </div>
      </div>

      {/* Recherche + vue */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans tout l'espace…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex rounded-md border border-input bg-card p-0.5">
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              aria-label={v === "grid" ? "Vue grille" : "Vue liste"}
              className={cn("flex h-7 w-8 items-center justify-center rounded transition-colors", view === v ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {v === "grid" ? <FolderClosed className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      {/* File d'upload */}
      {uploads.length > 0 && (
        <ul className="space-y-1.5">
          {uploads.map((it) => (
            <li key={it.id} className="animate-fade-up overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center gap-3 px-3 py-2">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", it.status === "error" ? "bg-destructive/10 text-destructive" : it.status === "done" ? "bg-success/10 text-success" : "bg-primary-subtle text-primary")}>
                  {it.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : it.status === "error" ? <CircleAlert className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{it.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {it.status === "uploading" && "Envoi en cours…"}
                    {it.status === "done" && "Ajouté"}
                    {it.status === "error" && (it.message ?? "Échec")}
                  </p>
                </div>
                {it.status !== "uploading" && (
                  <button type="button" onClick={() => setUploads((u) => u.filter((x) => x.id !== it.id))} aria-label="Masquer" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {it.status === "uploading" && (
                <div className="h-0.5 w-full overflow-hidden bg-primary-subtle">
                  <div className="h-full w-1/3 rounded-full bg-primary animate-progress-slide" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {opError && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{opError}</p>}

      {/* Barre de sélection multiple */}
      {selection.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary-subtle px-3 py-2">
          <span className="text-sm font-medium text-primary">
            {selection.size} sélectionné{selection.size > 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setMoveState({ kind: "docs", ids: [...selection].filter((k) => k.startsWith("d:")).map((k) => k.slice(2)), currentParent: currentFolderId })} disabled={[...selection].every((k) => k.startsWith("f:"))}>
              <Upload className="h-4 w-4" /> Déplacer
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={deleteSelection}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Contenu */}
      {isEmptyHere ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-16 text-center transition-colors hover:border-primary/50 hover:bg-primary-subtle/40"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
            <CloudUpload className="h-6 w-6 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {searching ? "Aucun résultat" : currentFolderId ? "Dossier vide" : "Votre Drive est vide"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searching ? "Essayez d'autres mots-clés." : <>Glissez vos fichiers ici ou <span className="font-medium text-primary">importez-les</span>.</>}
            </p>
          </div>
          {!searching && (
            <p className="text-xs text-muted-foreground">{formatStorage(maxFileBytes)} max par fichier</p>
          )}
        </button>
      ) : (
        <div className={cn(view === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2")}>
          {visibleFolders.map((folder) => (
            <FolderTile
              key={folder.id}
              folder={folder}
              count={folderCounts.get(folder.id) ?? 0}
              view={view}
              selected={selection.has(fKey(folder.id))}
              isDropTarget={dropFolderId === folder.id}
              onOpen={() => { setCurrentFolderId(folder.id); clearSelection(); setQuery(""); }}
              onToggleSelect={(additive) => toggleSelect(fKey(folder.id), additive)}
              onMenu={(e) => openFolderMenu(folder, e)}
              onDragStart={(e) => startDrag(fKey(folder.id), e)}
              onDragEnterFolder={() => setDropFolderId(folder.id)}
              onDragLeaveFolder={() => setDropFolderId((cur) => (cur === folder.id ? null : cur))}
              onDropOnFolder={() => dropOnFolder(folder.id)}
            />
          ))}
          {visibleDocs.map((doc) => (
            <FileTile
              key={doc.id}
              doc={doc}
              decision={decisions[doc.id] ?? null}
              viewed={viewedSet.has(doc.id)}
              downloaded={downloadedSet.has(doc.id)}
              view={view}
              selected={selection.has(dKey(doc.id))}
              onToggleSelect={(additive) => toggleSelect(dKey(doc.id), additive)}
              onMenu={(e) => openDocMenu(doc, e)}
              onDownload={() => {}}
              onDragStart={(e) => startDrag(dKey(doc.id), e)}
            />
          ))}
        </div>
      )}

      {/* Menu contextuel */}
      <ContextMenu state={menu} onClose={() => setMenu(null)} />

      {/* Dialogs */}
      <NameDialog
        open={newFolderOpen}
        onOpenChange={(o) => { setNewFolderOpen(o); if (!o) setOpError(null); }}
        title="Nouveau dossier"
        label="Nom du dossier"
        submitLabel="Créer le dossier"
        busy={opPending}
        error={opError}
        onSubmit={createFolder}
      />
      {renameFolder && (
        <NameDialog
          open
          onOpenChange={(o) => { if (!o) setRenameFolder(null); }}
          title="Renommer le dossier"
          label="Nom du dossier"
          initialValue={renameFolder.name}
          submitLabel="Renommer"
          busy={opPending}
          onSubmit={doRenameFolder}
        />
      )}
      {editDoc && (
        <DocumentEditDialog
          doc={editDoc}
          workspaceId={workspaceId}
          open
          onOpenChange={(o) => { if (!o) setEditDoc(null); }}
        />
      )}
      {moveState && (
        <MoveDialog
          open
          onOpenChange={(o) => { if (!o) setMoveState(null); }}
          folders={folders}
          excludedIds={moveExcluded}
          currentParentId={moveState.currentParent}
          title="Déplacer vers…"
          description="Choisissez le dossier de destination."
          busy={opPending}
          onMove={doMove}
        />
      )}
      {confirm && (
        <Dialog open onOpenChange={(o) => { if (!o) setConfirm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>{confirm.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)} disabled={opPending}>Annuler</Button>
              <Button variant="destructive" onClick={confirm.onConfirm} disabled={opPending}>
                {opPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {confirm.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
