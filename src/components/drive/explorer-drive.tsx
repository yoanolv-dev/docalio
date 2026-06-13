"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CheckCircle2,
  CloudUpload,
  Copy,
  Download,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  FolderPlus,
  House,
  LayoutGrid,
  List as ListIcon,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileIcon } from "@/components/documents/file-icon";
import { DocumentEditDialog } from "@/components/documents/document-edit-dialog";
import {
  ContextMenu,
  type ContextMenuEntry,
  type ContextMenuState,
} from "@/components/drive/context-menu";
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
import {
  deriveDocumentState,
  DOCUMENT_STATE_CONFIG,
  type DocumentShareState,
} from "@/lib/document-state";
import { buildBreadcrumb } from "@/lib/folder-tree";
import { FILE_ACCEPT_ATTRIBUTE, formatBytes, validateFile } from "@/lib/files";
import { cn, formatDate } from "@/lib/utils";
import type { Document, DocumentDecision, Folder as FolderType } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Drive « Explorateur de fichiers » — paradigme familier (Windows) : volet
// d'arborescence à gauche, barre d'adresse (fil d'Ariane), vue Grandes icônes
// ou Détails, double-clic pour ouvrir, clic droit, glisser-déposer, sélection
// multiple. Aucune disposition spatiale : dense, rapide, sans courbe
// d'apprentissage.
// ---------------------------------------------------------------------------

const ROOT = "__root__";
const fKey = (id: string) => `f:${id}`;
const dKey = (id: string) => `d:${id}`;
const idOf = (key: string) => key.slice(2);

type ViewMode = "grid" | "list";
type SortKey = "name" | "modified" | "size" | "state";
type SortDir = "asc" | "desc";

const STATE_RANK: Record<DocumentShareState, number> = {
  private: 0,
  shared: 1,
  viewed: 2,
  downloaded: 3,
  changes_requested: 4,
  rejected: 5,
  approved: 6,
};

interface UploadItem {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

interface ExplorerDriveProps {
  documents: Document[];
  folders: FolderType[];
  workspaceId: string;
  decisions: Record<string, DocumentDecision>;
  viewedDocumentIds: string[];
  downloadedDocumentIds: string[];
  maxFileBytes: number;
}

export function ExplorerDrive({
  documents,
  folders,
  workspaceId,
  decisions,
  viewedDocumentIds,
  downloadedDocumentIds,
  maxFileBytes,
}: ExplorerDriveProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragData = useRef<{ keys: string[] } | null>(null);
  const extDepth = useRef(0);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("grid");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [visOverride, setVisOverride] = useState<Map<string, boolean>>(new Map());
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [extDragging, setExtDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [newFolderParent, setNewFolderParent] = useState<{ parentId: string | null } | null>(null);
  const [renameTarget, setRenameTarget] = useState<FolderType | null>(null);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [, startOp] = useTransition();

  const viewedSet = useMemo(() => new Set(viewedDocumentIds), [viewedDocumentIds]);
  const downloadedSet = useMemo(() => new Set(downloadedDocumentIds), [downloadedDocumentIds]);

  // Index parent → enfants (dossiers / documents) + compteurs.
  const folderChildren = useMemo(() => {
    const m = new Map<string | null, FolderType[]>();
    for (const f of folders) {
      const k = f.parent_id ?? null;
      const arr = m.get(k);
      if (arr) arr.push(f);
      else m.set(k, [f]);
    }
    return m;
  }, [folders]);

  const docChildren = useMemo(() => {
    const m = new Map<string | null, Document[]>();
    for (const d of documents) {
      const k = d.folder_id ?? null;
      const arr = m.get(k);
      if (arr) arr.push(d);
      else m.set(k, [d]);
    }
    return m;
  }, [documents]);

  const countOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of folders) {
      if (!f.parent_id) continue;
      m.set(f.parent_id, (m.get(f.parent_id) ?? 0) + 1);
    }
    for (const d of documents) {
      if (!d.folder_id) continue;
      m.set(d.folder_id, (m.get(d.folder_id) ?? 0) + 1);
    }
    return m;
  }, [folders, documents]);

  const breadcrumb = useMemo(
    () => buildBreadcrumb(folders, currentFolderId),
    [folders, currentFolderId]
  );

  function docState(doc: Document): DocumentShareState {
    return deriveDocumentState({
      isVisible: visOverride.get(doc.id) ?? doc.is_visible_to_client,
      decision: decisions[doc.id]?.decision ?? null,
      viewed: viewedSet.has(doc.id),
      downloaded: downloadedSet.has(doc.id),
    });
  }

  // Contenu du dossier courant, trié (dossiers d'abord, puis documents).
  // Calculs simples laissés à la mémoïsation automatique du compilateur React.
  const sortMul = sortDir === "asc" ? 1 : -1;
  const currentFolders = [...(folderChildren.get(currentFolderId) ?? [])].sort((a, b) => {
    if (sortKey === "modified") {
      return sortMul * (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
    }
    return sortMul * a.name.localeCompare(b.name, "fr", { numeric: true });
  });

  const currentDocs = [...(docChildren.get(currentFolderId) ?? [])].sort((a, b) => {
    switch (sortKey) {
      case "size":
        return sortMul * ((a.file_size ?? 0) - (b.file_size ?? 0));
      case "modified":
        return sortMul * (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
      case "state":
        return sortMul * (STATE_RANK[docState(a)] - STATE_RANK[docState(b)]);
      default:
        return sortMul * a.title.localeCompare(b.title, "fr", { numeric: true });
    }
  });

  const orderedKeys = [
    ...currentFolders.map((f) => fKey(f.id)),
    ...currentDocs.map((d) => dKey(d.id)),
  ];

  const isEmpty = orderedKeys.length === 0;
  const totalCount = currentFolders.length + currentDocs.length;

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  function navigate(id: string | null) {
    setCurrentFolderId(id);
    setSelected(new Set());
    setAnchor(null);
    if (id) {
      setExpanded((prev) => {
        const n = new Set(prev);
        for (const c of buildBreadcrumb(folders, id)) n.add(c.id);
        return n;
      });
    }
  }
  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  const parentId = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2].id : null;

  // ---------------------------------------------------------------------------
  // Sélection
  // ---------------------------------------------------------------------------
  function selectOnly(key: string) {
    setSelected(new Set([key]));
    setAnchor(key);
  }
  function handleSelectClick(key: string, e: ReactMouseEvent) {
    if (e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const n = new Set(prev);
        if (n.has(key)) n.delete(key);
        else n.add(key);
        return n;
      });
      setAnchor(key);
    } else if (e.shiftKey && anchor) {
      const a = orderedKeys.indexOf(anchor);
      const b = orderedKeys.indexOf(key);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelected(new Set(orderedKeys.slice(lo, hi + 1)));
      }
    } else {
      selectOnly(key);
    }
  }

  // ---------------------------------------------------------------------------
  // Glisser-déposer (déplacement interne + import OS)
  // ---------------------------------------------------------------------------
  function onItemDragStart(key: string, e: ReactDragEvent) {
    const keys = selected.has(key) && selected.size > 1 ? [...selected] : [key];
    if (!(selected.has(key) && selected.size > 1)) selectOnly(key);
    dragData.current = { keys };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-docalio", keys.join(","));
  }
  function onItemDragEnd() {
    dragData.current = null;
    setDropTarget(null);
  }
  function onFolderDragOver(folderId: string | null, e: ReactDragEvent) {
    const internal = dragData.current;
    const hasFiles = e.dataTransfer.types.includes("Files");
    if (!internal && !hasFiles) return;
    if (internal && folderId && internal.keys.includes(fKey(folderId))) return; // pas sur soi-même
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = internal ? "move" : "copy";
    setDropTarget(folderId ?? ROOT);
  }
  function onFolderDrop(folderId: string | null, e: ReactDragEvent) {
    const internal = dragData.current;
    const files = e.dataTransfer.files;
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);
    setExtDragging(false);
    extDepth.current = 0;
    if (internal) {
      moveItemsInto(internal.keys, folderId);
      dragData.current = null;
    } else if (files && files.length) {
      uploadFiles(Array.from(files), folderId);
    }
  }
  function moveItemsInto(keys: string[], target: string | null) {
    setOpError(null);
    startOp(async () => {
      for (const key of keys) {
        const id = idOf(key);
        if (key.startsWith("f:")) {
          if (target && id === target) continue;
          const r = await moveFolderAction(id, target);
          if (!r.ok) setOpError(r.message ?? "Déplacement impossible.");
        } else {
          const r = await moveDocumentAction(id, target);
          if (!r.ok) setOpError(r.message ?? "Déplacement impossible.");
        }
      }
      setSelected(new Set());
    });
  }

  // Import OS sur le fond (= dossier courant).
  function onPaneDragEnter(e: ReactDragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    extDepth.current += 1;
    setExtDragging(true);
  }
  function onPaneDragOver(e: ReactDragEvent) {
    if (dragData.current || e.dataTransfer.types.includes("Files")) e.preventDefault();
  }
  function onPaneDragLeave(e: ReactDragEvent) {
    if (!e.dataTransfer.types.includes("Files")) return;
    extDepth.current = Math.max(0, extDepth.current - 1);
    if (extDepth.current === 0) setExtDragging(false);
  }
  function onPaneDrop(e: ReactDragEvent) {
    if (dragData.current) {
      // déplacement interne déposé dans le vide = dossier courant
      e.preventDefault();
      moveItemsInto(dragData.current.keys, currentFolderId);
      dragData.current = null;
      setDropTarget(null);
      return;
    }
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    extDepth.current = 0;
    setExtDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files ?? []), currentFolderId);
  }

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------
  async function uploadFiles(files: File[], folderId: string | null) {
    if (files.length === 0) return;
    const accepted: { id: string; file: File }[] = [];
    for (const file of files) {
      const id = crypto.randomUUID();
      const err = validateFile(file, maxFileBytes);
      if (err) {
        setUploads((u) => [...u, { id, name: file.name, status: "error", message: err }]);
        continue;
      }
      accepted.push({ id, file });
      setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
    }
    for (const { id, file } of accepted) {
      const fd = new FormData();
      fd.set("workspace_id", workspaceId);
      if (folderId) fd.set("folder_id", folderId);
      fd.set("file", file);
      let r: { ok: boolean; message?: string } | null = null;
      try {
        r = await uploadDocumentAction(null, fd);
      } catch {
        r = { ok: false, message: "L'envoi a échoué." };
      }
      setUploads((u) =>
        u.map((it) =>
          it.id === id
            ? { ...it, status: r?.ok ? "done" : "error", message: r?.ok ? undefined : r?.message }
            : it
        )
      );
      if (r?.ok) window.setTimeout(() => setUploads((u) => u.filter((it) => it.id !== id)), 3500);
    }
  }

  // ---------------------------------------------------------------------------
  // Opérations
  // ---------------------------------------------------------------------------
  function createFolder(name: string) {
    if (!newFolderParent) return;
    const parent = newFolderParent.parentId;
    setOpError(null);
    startOp(async () => {
      const r = await createFolderAction(workspaceId, parent, name);
      if (r.ok) setNewFolderParent(null);
      else setOpError(r.message ?? "Création impossible.");
    });
  }
  function doRename(name: string) {
    if (!renameTarget) return;
    const id = renameTarget.id;
    startOp(async () => {
      const r = await renameFolderAction(id, name);
      if (r.ok) setRenameTarget(null);
      else setOpError(r.message ?? "Renommage impossible.");
    });
  }
  function deleteFolder(folder: FolderType) {
    setConfirm({
      title: "Supprimer ce dossier ?",
      description: `« ${folder.name} » et tout son contenu seront définitivement supprimés.`,
      onConfirm: () =>
        startOp(async () => {
          await deleteFolderAction(folder.id);
          if (currentFolderId === folder.id) navigate(folder.parent_id ?? null);
          setConfirm(null);
        }),
    });
  }
  function deleteDoc(doc: Document) {
    setConfirm({
      title: "Supprimer ce document ?",
      description: `« ${doc.title} » et son fichier seront définitivement supprimés.`,
      onConfirm: () =>
        startOp(async () => {
          const fd = new FormData();
          fd.set("document_id", doc.id);
          await deleteDocumentAction(fd);
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
  function toggleVisible(doc: Document, next: boolean) {
    setVisOverride((m) => new Map(m).set(doc.id, next));
    startOp(async () => {
      const r = await setDocumentVisibilityAction(doc.id, next);
      if (!r.ok) {
        setVisOverride((m) => {
          const n = new Map(m);
          n.delete(doc.id);
          return n;
        });
        setOpError(r.message ?? "Mise à jour impossible.");
      }
    });
  }
  async function downloadDoc(doc: Document) {
    const r = await getDocumentDownloadUrl(doc.id);
    if (r.ok) window.location.assign(r.url);
    else setOpError(r.message);
  }

  // ---------------------------------------------------------------------------
  // Menus contextuels
  // ---------------------------------------------------------------------------
  function openFolderMenu(folder: FolderType, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Ouvrir", icon: FolderOpen, onSelect: () => navigate(folder.id) },
        { label: "Nouveau sous-dossier", icon: FolderPlus, onSelect: () => setNewFolderParent({ parentId: folder.id }) },
        { label: "Renommer", icon: Pencil, onSelect: () => setRenameTarget(folder) },
        { type: "separator" },
        { label: "Supprimer", icon: Trash2, destructive: true, onSelect: () => deleteFolder(folder) },
      ],
    });
  }
  function openDocMenu(doc: Document, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const visible = visOverride.get(doc.id) ?? doc.is_visible_to_client;
    const items: ContextMenuEntry[] = [
      { label: "Télécharger", icon: Download, onSelect: () => downloadDoc(doc) },
      {
        label: visible ? "Rendre privé" : "Rendre visible au client",
        icon: visible ? EyeOff : Eye,
        onSelect: () => toggleVisible(doc, !visible),
      },
      {
        label: doc.allow_download ? "Bloquer le téléchargement" : "Autoriser le téléchargement",
        icon: doc.allow_download ? Lock : Download,
        onSelect: () =>
          startOp(async () => {
            await setDocumentDownloadAction(doc.id, !doc.allow_download);
          }),
      },
      { type: "separator" },
      { label: "Renommer", icon: Pencil, onSelect: () => setEditDoc(doc) },
      { label: "Dupliquer", icon: Copy, onSelect: () => duplicateDoc(doc) },
      { label: "Supprimer", icon: Trash2, destructive: true, onSelect: () => deleteDoc(doc) },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }
  function openPaneMenu(e: ReactMouseEvent) {
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Nouveau dossier", icon: FolderPlus, onSelect: () => setNewFolderParent({ parentId: currentFolderId }) },
        { label: "Importer des fichiers", icon: Upload, onSelect: () => inputRef.current?.click() },
      ],
    });
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const rootDropActive = dropTarget === ROOT;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Barre d'outils + barre d'adresse */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-2.5 py-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => navigate(parentId)}
            disabled={!currentFolderId}
            title="Dossier parent"
            aria-label="Dossier parent"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        {/* Barre d'adresse (fil d'Ariane) */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-md border border-border bg-background px-1.5 py-1 text-sm">
          <button
            type="button"
            onClick={() => navigate(null)}
            onDragOver={(e) => onFolderDragOver(null, e)}
            onDrop={(e) => onFolderDrop(null, e)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 font-medium transition-colors hover:bg-accent",
              rootDropActive ? "bg-primary-subtle text-primary ring-1 ring-primary" : currentFolderId ? "text-muted-foreground" : "text-foreground"
            )}
          >
            <House className="h-3.5 w-3.5" />
            Documents
          </button>
          {breadcrumb.map((c, i) => (
            <span key={c.id} className="flex shrink-0 items-center">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <button
                type="button"
                onClick={() => navigate(c.id)}
                onDragOver={(e) => onFolderDragOver(c.id, e)}
                onDrop={(e) => onFolderDrop(c.id, e)}
                className={cn(
                  "rounded px-1.5 py-0.5 font-medium transition-colors hover:bg-accent",
                  dropTarget === c.id ? "bg-primary-subtle text-primary ring-1 ring-primary" : i === breadcrumb.length - 1 ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {c.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setNewFolderParent({ parentId: currentFolderId })}>
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Dossier</span>
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importer</span>
          </Button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <div className="flex items-center rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              title="Grandes icônes"
              aria-label="Grandes icônes"
              className={cn("flex h-6 w-6 items-center justify-center rounded", view === "grid" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              title="Détails"
              aria-label="Détails"
              className={cn("flex h-6 w-6 items-center justify-center rounded", view === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(e) => {
          uploadFiles(Array.from(e.target.files ?? []), currentFolderId);
          e.target.value = "";
        }}
      />

      {/* Corps : arborescence + contenu */}
      <div className="grid h-[clamp(360px,52vh,520px)] grid-cols-1 md:grid-cols-[220px_1fr]">
        {/* Volet d'arborescence */}
        <aside className="hidden overflow-y-auto border-r border-border bg-muted/20 py-2 md:block">
          <button
            type="button"
            onClick={() => navigate(null)}
            onDragOver={(e) => onFolderDragOver(null, e)}
            onDrop={(e) => onFolderDrop(null, e)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-medium transition-colors",
              rootDropActive ? "bg-primary-subtle text-primary" : currentFolderId === null ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/60"
            )}
          >
            <House className="h-4 w-4 text-muted-foreground" />
            Documents
          </button>
          <ul>
            {(folderChildren.get(null) ?? [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }))
              .map((f) => (
                <TreeNode
                  key={f.id}
                  folder={f}
                  depth={1}
                  folderChildren={folderChildren}
                  expanded={expanded}
                  currentFolderId={currentFolderId}
                  dropTarget={dropTarget}
                  onToggle={toggleExpand}
                  onNavigate={navigate}
                  onMenu={openFolderMenu}
                  onDragOver={onFolderDragOver}
                  onDrop={onFolderDrop}
                />
              ))}
          </ul>
        </aside>

        {/* Contenu */}
        <div
          className="relative overflow-y-auto"
          onClick={() => setSelected(new Set())}
          onContextMenu={openPaneMenu}
          onDragEnter={onPaneDragEnter}
          onDragOver={onPaneDragOver}
          onDragLeave={onPaneDragLeave}
          onDrop={onPaneDrop}
        >
          {view === "grid" ? (
            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {currentFolders.map((f) => (
                <FolderTile
                  key={fKey(f.id)}
                  folder={f}
                  count={countOf.get(f.id) ?? 0}
                  selected={selected.has(fKey(f.id))}
                  isDropTarget={dropTarget === f.id}
                  onClick={(e) => handleSelectClick(fKey(f.id), e)}
                  onOpen={() => navigate(f.id)}
                  onMenu={(e) => openFolderMenu(f, e)}
                  onDragStart={(e) => onItemDragStart(fKey(f.id), e)}
                  onDragEnd={onItemDragEnd}
                  onDragOver={(e) => onFolderDragOver(f.id, e)}
                  onDrop={(e) => onFolderDrop(f.id, e)}
                />
              ))}
              {currentDocs.map((d) => {
                const visible = visOverride.get(d.id) ?? d.is_visible_to_client;
                return (
                  <FileTile
                    key={dKey(d.id)}
                    doc={d}
                    state={docState(d)}
                    visible={visible}
                    selected={selected.has(dKey(d.id))}
                    onClick={(e) => handleSelectClick(dKey(d.id), e)}
                    onOpen={() => downloadDoc(d)}
                    onMenu={(e) => openDocMenu(d, e)}
                    onToggleVisible={() => toggleVisible(d, !visible)}
                    onDragStart={(e) => onItemDragStart(dKey(d.id), e)}
                    onDragEnd={onItemDragEnd}
                  />
                );
              })}
            </div>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <SortableTh label="Nom" col="name" sortKey={sortKey} sortDir={sortDir} onSort={changeSort} className="pl-3" />
                  <SortableTh label="État" col="state" sortKey={sortKey} sortDir={sortDir} onSort={changeSort} className="hidden sm:table-cell" />
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Visible</th>
                  <SortableTh label="Taille" col="size" sortKey={sortKey} sortDir={sortDir} onSort={changeSort} className="hidden sm:table-cell" />
                  <SortableTh label="Modifié" col="modified" sortKey={sortKey} sortDir={sortDir} onSort={changeSort} className="hidden md:table-cell" />
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {currentFolders.map((f) => (
                  <FolderRow
                    key={fKey(f.id)}
                    folder={f}
                    count={countOf.get(f.id) ?? 0}
                    selected={selected.has(fKey(f.id))}
                    isDropTarget={dropTarget === f.id}
                    onClick={(e) => handleSelectClick(fKey(f.id), e)}
                    onOpen={() => navigate(f.id)}
                    onMenu={(e) => openFolderMenu(f, e)}
                    onDragStart={(e) => onItemDragStart(fKey(f.id), e)}
                    onDragEnd={onItemDragEnd}
                    onDragOver={(e) => onFolderDragOver(f.id, e)}
                    onDrop={(e) => onFolderDrop(f.id, e)}
                  />
                ))}
                {currentDocs.map((d) => {
                  const visible = visOverride.get(d.id) ?? d.is_visible_to_client;
                  return (
                    <FileRow
                      key={dKey(d.id)}
                      doc={d}
                      state={docState(d)}
                      visible={visible}
                      selected={selected.has(dKey(d.id))}
                      onClick={(e) => handleSelectClick(dKey(d.id), e)}
                      onOpen={() => downloadDoc(d)}
                      onMenu={(e) => openDocMenu(d, e)}
                      onToggleVisible={() => toggleVisible(d, !visible)}
                      onDragStart={(e) => onItemDragStart(dKey(d.id), e)}
                      onDragEnd={onItemDragEnd}
                    />
                  );
                })}
              </tbody>
            </table>
          )}

          {/* État vide */}
          {isEmpty && !extDragging && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <CloudUpload className="h-9 w-9 text-muted-foreground/50" />
              <p className="text-sm font-medium">{currentFolderId ? "Dossier vide" : "Aucun document"}</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Glissez vos fichiers ici, ou utilisez « Importer ».
              </p>
            </div>
          )}

          {/* Voile d'import externe */}
          {extDragging && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-primary bg-primary-subtle/70 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-2 text-primary">
                <CloudUpload className="h-8 w-8" />
                <p className="text-sm font-semibold">Déposez pour importer</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barre d'état */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          {totalCount} élément{totalCount > 1 ? "s" : ""}
        </span>
        {selected.size > 0 && (
          <span className="font-medium text-foreground">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* File d'upload */}
      {uploads.length > 0 && (
        <ul className="space-y-1.5 border-t border-border p-2">
          {uploads.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  it.status === "error"
                    ? "bg-destructive/10 text-destructive"
                    : it.status === "done"
                      ? "bg-success/10 text-success"
                      : "bg-primary-subtle text-primary"
                )}
              >
                {it.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : it.status === "error" ? (
                  <CircleAlert className="h-4 w-4" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {it.status === "uploading" ? "Envoi…" : it.status === "done" ? "Ajouté" : it.message ?? "Échec"}
                </p>
              </div>
              {it.status !== "uploading" && (
                <button
                  type="button"
                  onClick={() => setUploads((u) => u.filter((x) => x.id !== it.id))}
                  aria-label="Masquer"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {opError && (
        <p className="border-t border-border bg-destructive/10 px-3 py-2 text-sm text-destructive">{opError}</p>
      )}

      <ContextMenu state={menu} onClose={() => setMenu(null)} />

      <NameDialog
        open={newFolderParent !== null}
        onOpenChange={(o) => {
          if (!o) {
            setNewFolderParent(null);
            setOpError(null);
          }
        }}
        title="Nouveau dossier"
        label="Nom du dossier"
        submitLabel="Créer"
        error={opError}
        onSubmit={createFolder}
      />
      {renameTarget && (
        <NameDialog
          open
          onOpenChange={(o) => {
            if (!o) setRenameTarget(null);
          }}
          title="Renommer le dossier"
          label="Nom du dossier"
          initialValue={renameTarget.name}
          submitLabel="Renommer"
          onSubmit={doRename}
        />
      )}
      {editDoc && (
        <DocumentEditDialog
          doc={editDoc}
          workspaceId={workspaceId}
          open
          onOpenChange={(o) => {
            if (!o) setEditDoc(null);
          }}
        />
      )}
      {confirm && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setConfirm(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>{confirm.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={confirm.onConfirm}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// =============================================================================
// Arborescence (volet gauche)
// =============================================================================
function TreeNode({
  folder,
  depth,
  folderChildren,
  expanded,
  currentFolderId,
  dropTarget,
  onToggle,
  onNavigate,
  onMenu,
  onDragOver,
  onDrop,
}: {
  folder: FolderType;
  depth: number;
  folderChildren: Map<string | null, FolderType[]>;
  expanded: Set<string>;
  currentFolderId: string | null;
  dropTarget: string | null;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
  onMenu: (folder: FolderType, e: ReactMouseEvent) => void;
  onDragOver: (id: string, e: ReactDragEvent) => void;
  onDrop: (id: string, e: ReactDragEvent) => void;
}) {
  const children = folderChildren.get(folder.id);
  const hasChildren = !!children && children.length > 0;
  const isOpen = expanded.has(folder.id);
  const isCurrent = currentFolderId === folder.id;

  return (
    <li>
      <div
        onClick={() => onNavigate(folder.id)}
        onContextMenu={(e) => onMenu(folder, e)}
        onDragOver={(e) => onDragOver(folder.id, e)}
        onDrop={(e) => onDrop(folder.id, e)}
        style={{ paddingLeft: depth * 14 }}
        className={cn(
          "flex cursor-default items-center gap-1 py-1.5 pr-2 text-sm transition-colors",
          dropTarget === folder.id
            ? "bg-primary-subtle text-primary ring-1 ring-inset ring-primary"
            : isCurrent
              ? "bg-accent text-foreground"
              : "text-foreground hover:bg-accent/60"
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(folder.id);
          }}
          className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground", !hasChildren && "invisible")}
          aria-label={isOpen ? "Replier" : "Déplier"}
        >
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {isOpen && hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="truncate" title={folder.name}>
          {folder.name}
        </span>
      </div>
      {isOpen && hasChildren && (
        <ul>
          {children!
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }))
            .map((c) => (
              <TreeNode
                key={c.id}
                folder={c}
                depth={depth + 1}
                folderChildren={folderChildren}
                expanded={expanded}
                currentFolderId={currentFolderId}
                dropTarget={dropTarget}
                onToggle={onToggle}
                onNavigate={onNavigate}
                onMenu={onMenu}
                onDragOver={onDragOver}
                onDrop={onDrop}
              />
            ))}
        </ul>
      )}
    </li>
  );
}

// =============================================================================
// Vue grille (grandes icônes)
// =============================================================================
function FolderTile({
  folder,
  count,
  selected,
  isDropTarget,
  onClick,
  onOpen,
  onMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  folder: FolderType;
  count: number;
  selected: boolean;
  isDropTarget: boolean;
  onClick: (e: ReactMouseEvent) => void;
  onOpen: () => void;
  onMenu: (e: ReactMouseEvent) => void;
  onDragStart: (e: ReactDragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: ReactDragEvent) => void;
  onDrop: (e: ReactDragEvent) => void;
}) {
  return (
    <div
      draggable
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "group relative flex select-none flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center transition-colors",
        isDropTarget
          ? "border-primary bg-primary-subtle ring-1 ring-primary"
          : selected
            ? "border-primary/40 bg-primary-subtle"
            : "border-transparent hover:bg-accent/60"
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Actions"
        className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <Folder className="h-12 w-12 text-primary" strokeWidth={1.25} />
      <div className="w-full">
        <p className="truncate text-xs font-medium" title={folder.name}>
          {folder.name}
        </p>
        <p className="text-[11px] text-muted-foreground">{count} élément{count > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

function FileTile({
  doc,
  state,
  visible,
  selected,
  onClick,
  onOpen,
  onMenu,
  onToggleVisible,
  onDragStart,
  onDragEnd,
}: {
  doc: Document;
  state: DocumentShareState;
  visible: boolean;
  selected: boolean;
  onClick: (e: ReactMouseEvent) => void;
  onOpen: () => void;
  onMenu: (e: ReactMouseEvent) => void;
  onToggleVisible: () => void;
  onDragStart: (e: ReactDragEvent) => void;
  onDragEnd: () => void;
}) {
  const cfg = DOCUMENT_STATE_CONFIG[state];
  const StateIcon = cfg.icon;
  return (
    <div
      draggable
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex select-none flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center transition-colors",
        selected ? "border-primary/40 bg-primary-subtle" : "border-transparent hover:bg-accent/60"
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMenu(e);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Actions"
        className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <FileIcon filePath={doc.file_path} />
      <div className="w-full">
        <p className="line-clamp-2 text-xs font-medium leading-snug" title={doc.title}>
          {doc.title}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <StateIcon className="h-3 w-3" />
          {cfg.label}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title={visible ? "Visible client — cliquer pour passer en privé" : "Privé — cliquer pour partager"}
        className={cn(
          "absolute bottom-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border transition active:scale-95",
          visible ? "border-primary/30 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
        )}
      >
        {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// =============================================================================
// Vue détails (liste)
// =============================================================================
function SortableTh({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === col;
  return (
    <th className={cn("px-3 py-2 font-medium", className)}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn("inline-flex items-center gap-1 transition-colors hover:text-foreground", active && "text-foreground")}
      >
        {label}
        {active &&
          (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function FolderRow({
  folder,
  count,
  selected,
  isDropTarget,
  onClick,
  onOpen,
  onMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  folder: FolderType;
  count: number;
  selected: boolean;
  isDropTarget: boolean;
  onClick: (e: ReactMouseEvent) => void;
  onOpen: () => void;
  onMenu: (e: ReactMouseEvent) => void;
  onDragStart: (e: ReactDragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: ReactDragEvent) => void;
  onDrop: (e: ReactDragEvent) => void;
}) {
  return (
    <tr
      draggable
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "cursor-default select-none border-b border-border/60 transition-colors",
        isDropTarget ? "bg-primary-subtle ring-1 ring-inset ring-primary" : selected ? "bg-primary-subtle" : "hover:bg-accent/50"
      )}
    >
      <td className="py-1.5 pl-3">
        <span className="flex items-center gap-2.5">
          <Folder className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
          <span className="truncate font-medium" title={folder.name}>
            {folder.name}
          </span>
        </span>
      </td>
      <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">Dossier</td>
      <td className="hidden px-3 py-1.5 lg:table-cell" />
      <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{count} élt{count > 1 ? "s" : ""}</td>
      <td className="hidden px-3 py-1.5 text-muted-foreground md:table-cell">{formatDate(folder.updated_at)}</td>
      <td className="px-2 py-1.5 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e);
          }}
          aria-label="Actions"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function FileRow({
  doc,
  state,
  visible,
  selected,
  onClick,
  onOpen,
  onMenu,
  onToggleVisible,
  onDragStart,
  onDragEnd,
}: {
  doc: Document;
  state: DocumentShareState;
  visible: boolean;
  selected: boolean;
  onClick: (e: ReactMouseEvent) => void;
  onOpen: () => void;
  onMenu: (e: ReactMouseEvent) => void;
  onToggleVisible: () => void;
  onDragStart: (e: ReactDragEvent) => void;
  onDragEnd: () => void;
}) {
  const cfg = DOCUMENT_STATE_CONFIG[state];
  const StateIcon = cfg.icon;
  return (
    <tr
      draggable
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-default select-none border-b border-border/60 transition-colors",
        selected ? "bg-primary-subtle" : "hover:bg-accent/50"
      )}
    >
      <td className="py-1.5 pl-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 [&>div]:h-7 [&>div]:w-7 [&_svg]:h-4 [&_svg]:w-4">
            <FileIcon filePath={doc.file_path} />
          </span>
          <span className="truncate font-medium" title={doc.title}>
            {doc.title}
          </span>
        </span>
      </td>
      <td className="hidden px-3 py-1.5 sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <StateIcon className="h-3.5 w-3.5" />
          {cfg.label}
        </span>
      </td>
      <td className="hidden px-3 py-1.5 lg:table-cell">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
          title={visible ? "Visible client — cliquer pour passer en privé" : "Privé — cliquer pour partager"}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full border transition active:scale-95",
            visible ? "border-primary/30 bg-primary-subtle text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </td>
      <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{formatBytes(doc.file_size)}</td>
      <td className="hidden px-3 py-1.5 text-muted-foreground md:table-cell">{formatDate(doc.updated_at)}</td>
      <td className="px-2 py-1.5 text-right">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e);
          }}
          aria-label="Actions"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
