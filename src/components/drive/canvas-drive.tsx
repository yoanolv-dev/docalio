"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Copy,
  CornerUpLeft,
  Download,
  Eye,
  EyeOff,
  FolderPlus,
  House,
  ChevronRight,
  Lock,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Plus,
  Minus,
  Trash2,
  Upload,
  CloudUpload,
  CheckCircle2,
  CircleAlert,
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
  setItemPositionAction,
} from "@/lib/actions/folders";
import { deriveDocumentState, DOCUMENT_STATE_CONFIG } from "@/lib/document-state";
import { buildBreadcrumb } from "@/lib/folder-tree";
import { FILE_ACCEPT_ATTRIBUTE, validateFile } from "@/lib/files";
import { cn } from "@/lib/utils";
import type { Document, DocumentDecision, Folder } from "@/lib/types/database";

// Géométrie du monde (px à zoom 1)
const FOLDER_W = 188;
const FOLDER_H = 116;
const FILE_W = 188;
const FILE_H = 168;
const GAP = 40;
const COLS = 4;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.4;

type Vec = { x: number; y: number };
type Cam = { x: number; y: number; zoom: number };

interface UploadItem {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

interface CanvasDriveProps {
  documents: Document[];
  folders: Folder[];
  workspaceId: string;
  decisions: Record<string, DocumentDecision>;
  viewedDocumentIds: string[];
  downloadedDocumentIds: string[];
  maxFileBytes: number;
}

const fKey = (id: string) => `f:${id}`;
const dKey = (id: string) => `d:${id}`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function CanvasDrive({
  documents,
  folders,
  workspaceId,
  decisions,
  viewedDocumentIds,
  downloadedDocumentIds,
  maxFileBytes,
}: CanvasDriveProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [cam, setCam] = useState<Cam>({ x: 48, y: 48, zoom: 1 });
  const camRef = useRef(cam);
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);

  const [overrides, setOverrides] = useState<Map<string, Vec>>(new Map());
  const [visOverride, setVisOverride] = useState<Map<string, boolean>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const [extDragging, setExtDragging] = useState(false);
  const extDepth = useRef(0);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [animate, setAnimate] = useState(false);

  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [newFolder, setNewFolder] = useState<Vec | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
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

  const breadcrumb = useMemo(
    () => buildBreadcrumb(folders, currentFolderId),
    [folders, currentFolderId]
  );

  const childFolders = useMemo(
    () => folders.filter((f) => (f.parent_id ?? null) === currentFolderId),
    [folders, currentFolderId]
  );
  const childDocs = useMemo(
    () => documents.filter((d) => (d.folder_id ?? null) === currentFolderId),
    [documents, currentFolderId]
  );

  const folderCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of folders) if (f.parent_id) m.set(f.parent_id, (m.get(f.parent_id) ?? 0) + 1);
    for (const d of documents) if (d.folder_id) m.set(d.folder_id, (m.get(d.folder_id) ?? 0) + 1);
    return m;
  }, [folders, documents]);

  // Position d'un élément : override (drag en cours) > position serveur > auto-grille.
  const positionOf = useCallback(
    (key: string, savedX: number | null, savedY: number | null, index: number): Vec => {
      const o = overrides.get(key);
      if (o) return o;
      if (savedX != null && savedY != null) return { x: savedX, y: savedY };
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      return { x: col * (FILE_W + GAP), y: row * (FILE_H + GAP) };
    },
    [overrides]
  );

  // Liste ordonnée (dossiers puis documents) avec index pour l'auto-disposition.
  const nodes = useMemo(() => {
    const list: {
      key: string;
      kind: "folder" | "document";
      id: string;
      pos: Vec;
      w: number;
      h: number;
      folder?: Folder;
      doc?: Document;
    }[] = [];
    let i = 0;
    for (const f of childFolders) {
      list.push({
        key: fKey(f.id),
        kind: "folder",
        id: f.id,
        pos: positionOf(fKey(f.id), f.pos_x, f.pos_y, i),
        w: FOLDER_W,
        h: FOLDER_H,
        folder: f,
      });
      i++;
    }
    for (const d of childDocs) {
      list.push({
        key: dKey(d.id),
        kind: "document",
        id: d.id,
        pos: positionOf(dKey(d.id), d.pos_x, d.pos_y, i),
        w: FILE_W,
        h: FILE_H,
        doc: d,
      });
      i++;
    }
    return list;
  }, [childFolders, childDocs, positionOf]);

  const isEmpty = nodes.length === 0;

  // ---------------------------------------------------------------------------
  // Caméra : ajuster, recadrer à l'entrée d'un dossier
  // ---------------------------------------------------------------------------
  const fitView = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { width, height } = vp.getBoundingClientRect();
    if (nodes.length === 0) {
      setCam({ x: 48, y: 48, zoom: 1 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.pos.x);
      minY = Math.min(minY, n.pos.y);
      maxX = Math.max(maxX, n.pos.x + n.w);
      maxY = Math.max(maxY, n.pos.y + n.h);
    }
    const pad = 60;
    const cw = maxX - minX + pad * 2;
    const ch = maxY - minY + pad * 2;
    const zoom = clamp(Math.min(width / cw, height / ch, 1.1), MIN_ZOOM, MAX_ZOOM);
    const x = (width - (maxX + minX) * zoom) / 2;
    const y = (height - (maxY + minY) * zoom) / 2;
    setAnimate(true);
    setCam({ x, y, zoom });
    window.setTimeout(() => setAnimate(false), 360);
  }, [nodes]);

  function enterFolder(id: string) {
    setCurrentFolderId(id);
    setSelected(null);
    setAnimate(true);
    setCam({ x: 48, y: 48, zoom: 1 });
    window.setTimeout(() => setAnimate(false), 360);
  }
  function navigateTo(id: string | null) {
    setCurrentFolderId(id);
    setSelected(null);
    setCam({ x: 48, y: 48, zoom: 1 });
  }

  // ---------------------------------------------------------------------------
  // Zoom molette (centré sur le curseur)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const c = camRef.current;
      const wx = (cx - c.x) / c.zoom;
      const wy = (cy - c.y) / c.zoom;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const zoom = clamp(c.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      setCam({ x: cx - wx * zoom, y: cy - wy * zoom, zoom });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  function zoomBy(factor: number) {
    const vp = viewportRef.current;
    if (!vp) return;
    const { width, height } = vp.getBoundingClientRect();
    const c = camRef.current;
    const wx = (width / 2 - c.x) / c.zoom;
    const wy = (height / 2 - c.y) / c.zoom;
    const zoom = clamp(c.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    setCam({ x: width / 2 - wx * zoom, y: height / 2 - wy * zoom, zoom });
  }

  // ---------------------------------------------------------------------------
  // Pan (fond) & drag d'élément
  // ---------------------------------------------------------------------------
  const drag = useRef<
    | { mode: "pan"; sx: number; sy: number; cx: number; cy: number; moved: boolean }
    | { mode: "item"; key: string; kind: "folder" | "document"; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }
    | null
  >(null);

  function onViewportPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
    viewportRef.current?.setPointerCapture(e.pointerId);
  }
  function onViewportPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.mode !== "pan") return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setCam((c) => ({ ...c, x: d.cx + dx, y: d.cy + dy }));
  }
  function onViewportPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    viewportRef.current?.releasePointerCapture?.(e.pointerId);
    if (d?.mode === "pan" && !d.moved) setSelected(null);
    drag.current = null;
  }

  function hitFolder(centerX: number, centerY: number, exceptKey: string): Folder | null {
    for (const n of nodes) {
      if (n.kind !== "folder" || n.key === exceptKey) continue;
      if (
        centerX >= n.pos.x &&
        centerX <= n.pos.x + n.w &&
        centerY >= n.pos.y &&
        centerY <= n.pos.y + n.h
      )
        return n.folder!;
    }
    return null;
  }

  function onNodePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    node: { key: string; kind: "folder" | "document"; id: string; pos: Vec }
  ) {
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      mode: "item",
      key: node.key,
      kind: node.kind,
      id: node.id,
      sx: e.clientX,
      sy: e.clientY,
      ox: node.pos.x,
      oy: node.pos.y,
      moved: false,
    };
    setSelected(node.key);
  }
  function onNodePointerMove(e: ReactPointerEvent<HTMLDivElement>, node: { key: string; w: number; h: number }) {
    const d = drag.current;
    if (!d || d.mode !== "item" || d.key !== node.key) return;
    const dx = (e.clientX - d.sx) / cam.zoom;
    const dy = (e.clientY - d.sy) / cam.zoom;
    if (Math.abs(dx) + Math.abs(dy) > 3 / cam.zoom) d.moved = true;
    const nx = d.ox + dx;
    const ny = d.oy + dy;
    setOverrides((m) => new Map(m).set(d.key, { x: nx, y: ny }));
    const target = hitFolder(nx + node.w / 2, ny + node.h / 2, d.key);
    setDropFolderId(target?.id ?? null);
  }
  function onNodePointerUp(
    e: ReactPointerEvent<HTMLDivElement>,
    node: { key: string; kind: "folder" | "document"; id: string; w: number; h: number }
  ) {
    const d = drag.current;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    drag.current = null;
    if (!d || d.mode !== "item") return;
    if (!d.moved) return; // simple sélection
    const pos = overrides.get(d.key) ?? { x: d.ox, y: d.oy };
    const target = hitFolder(pos.x + node.w / 2, pos.y + node.h / 2, d.key);
    setDropFolderId(null);
    if (target) {
      // Déplacer dans le dossier survolé
      setOverrides((m) => {
        const n = new Map(m);
        n.delete(d.key);
        return n;
      });
      startOp(async () => {
        const r =
          d.kind === "folder"
            ? await moveFolderAction(d.id, target.id)
            : await moveDocumentAction(d.id, target.id);
        if (!r.ok) setOpError(r.message ?? "Déplacement impossible.");
      });
    } else {
      // Persister la nouvelle position
      startOp(async () => {
        await setItemPositionAction(d.kind, d.id, pos.x, pos.y);
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Upload (au point de dépôt, dans le dossier courant)
  // ---------------------------------------------------------------------------
  const uploadFiles = useCallback(
    async (files: File[], dropAt?: Vec) => {
      if (files.length === 0) return;
      const queue: { id: string; file: File; at: Vec }[] = [];
      files.forEach((file, idx) => {
        const id = crypto.randomUUID();
        const err = validateFile(file, maxFileBytes);
        if (err) {
          setUploads((u) => [...u, { id, name: file.name, status: "error", message: err }]);
          return;
        }
        const at = dropAt
          ? { x: dropAt.x + idx * 26, y: dropAt.y + idx * 26 }
          : { x: (nodes.length + idx) % COLS * (FILE_W + GAP), y: Math.floor((nodes.length + idx) / COLS) * (FILE_H + GAP) };
        queue.push({ id, file, at });
        setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
      });
      for (const { id, file, at } of queue) {
        const fd = new FormData();
        fd.set("workspace_id", workspaceId);
        if (currentFolderId) fd.set("folder_id", currentFolderId);
        fd.set("pos_x", String(Math.round(at.x)));
        fd.set("pos_y", String(Math.round(at.y)));
        fd.set("file", file);
        let r: { ok: boolean; message?: string } | null = null;
        try {
          r = await uploadDocumentAction(null, fd);
        } catch {
          r = { ok: false, message: "L'envoi a échoué." };
        }
        setUploads((u) =>
          u.map((it) => (it.id === id ? { ...it, status: r?.ok ? "done" : "error", message: r?.ok ? undefined : r?.message } : it))
        );
        if (r?.ok) window.setTimeout(() => setUploads((u) => u.filter((it) => it.id !== id)), 3500);
      }
    },
    [maxFileBytes, workspaceId, currentFolderId, nodes.length]
  );

  function screenToWorld(clientX: number, clientY: number): Vec {
    const rect = viewportRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - cam.x) / cam.zoom, y: (clientY - rect.top - cam.y) / cam.zoom };
  }

  function onExtDrop(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    extDepth.current = 0;
    setExtDragging(false);
    const at = screenToWorld(e.clientX, e.clientY);
    uploadFiles(Array.from(e.dataTransfer.files ?? []), at);
  }

  // ---------------------------------------------------------------------------
  // Opérations
  // ---------------------------------------------------------------------------
  function createFolderAt(name: string) {
    if (!newFolder) return;
    const at = newFolder;
    setOpError(null);
    startOp(async () => {
      const r = await createFolderAction(workspaceId, currentFolderId, name, { x: at.x, y: at.y });
      if (r.ok) setNewFolder(null);
      else setOpError(r.message ?? "Création impossible.");
    });
  }
  function doRenameFolder(name: string) {
    if (!renameFolder) return;
    const id = renameFolder.id;
    startOp(async () => {
      const r = await renameFolderAction(id, name);
      if (r.ok) setRenameFolder(null);
      else setOpError(r.message ?? "Renommage impossible.");
    });
  }
  function deleteFolder(folder: Folder) {
    setConfirm({
      title: "Supprimer ce dossier ?",
      description: `« ${folder.name} » et tout son contenu seront définitivement supprimés.`,
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
  }

  function openFolderMenu(folder: Folder, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Ouvrir", icon: House, onSelect: () => enterFolder(folder.id) },
        { label: "Renommer", icon: Pencil, onSelect: () => setRenameFolder(folder) },
        { type: "separator" },
        { label: "Supprimer", icon: Trash2, destructive: true, onSelect: () => deleteFolder(folder) },
      ],
    });
  }
  function openDocMenu(doc: Document, visible: boolean, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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
  function openCanvasMenu(e: ReactMouseEvent) {
    e.preventDefault();
    const at = screenToWorld(e.clientX, e.clientY);
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: "Nouveau dossier ici", icon: FolderPlus, onSelect: () => setNewFolder(at) },
        { label: "Importer des fichiers", icon: Upload, onSelect: () => inputRef.current?.click() },
      ],
    });
  }

  return (
    <div className="space-y-3">
      {/* Fil d'Ariane */}
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <button
          type="button"
          onClick={() => navigateTo(null)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors hover:bg-accent",
            currentFolderId ? "text-muted-foreground" : "text-foreground"
          )}
        >
          <House className="h-4 w-4" />
          Documents
        </button>
        {breadcrumb.map((c, i) => (
          <span key={c.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <button
              type="button"
              onClick={() => navigateTo(c.id)}
              className={cn(
                "rounded-md px-2 py-1 font-medium transition-colors hover:bg-accent",
                i === breadcrumb.length - 1 ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {c.name}
            </button>
          </span>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(e) => {
          uploadFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {/* Le canvas */}
      <div
        ref={viewportRef}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onContextMenu={openCanvasMenu}
        onDragEnter={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          extDepth.current += 1;
          setExtDragging(true);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          extDepth.current = Math.max(0, extDepth.current - 1);
          if (extDepth.current === 0) setExtDragging(false);
        }}
        onDrop={onExtDrop}
        className="bg-grid relative h-[64vh] min-h-[460px] touch-none cursor-grab overflow-hidden rounded-2xl border border-border bg-card active:cursor-grabbing"
      >
        {/* Monde transformé */}
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
            transition: animate ? "transform 340ms cubic-bezier(0.16,1,0.3,1)" : "none",
          }}
        >
          {nodes.map((n) =>
            n.kind === "folder" ? (
              <FolderNode
                key={n.key}
                folder={n.folder!}
                pos={n.pos}
                count={folderCounts.get(n.id) ?? 0}
                selected={selected === n.key}
                isDropTarget={dropFolderId === n.id}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onPointerMove={(e) => onNodePointerMove(e, n)}
                onPointerUp={(e) => onNodePointerUp(e, n)}
                onOpen={() => enterFolder(n.id)}
                onMenu={(e) => openFolderMenu(n.folder!, e)}
              />
            ) : (
              <FileNode
                key={n.key}
                doc={n.doc!}
                pos={n.pos}
                visible={visOverride.get(n.id) ?? n.doc!.is_visible_to_client}
                state={deriveDocumentState({
                  isVisible: visOverride.get(n.id) ?? n.doc!.is_visible_to_client,
                  decision: decisions[n.id]?.decision ?? null,
                  viewed: viewedSet.has(n.id),
                  downloaded: downloadedSet.has(n.id),
                })}
                selected={selected === n.key}
                onPointerDown={(e) => onNodePointerDown(e, n)}
                onPointerMove={(e) => onNodePointerMove(e, n)}
                onPointerUp={(e) => onNodePointerUp(e, n)}
                onOpen={() => downloadDoc(n.doc!)}
                onToggleVisible={() => toggleVisible(n.doc!, !(visOverride.get(n.id) ?? n.doc!.is_visible_to_client))}
                onMenu={(e) => openDocMenu(n.doc!, visOverride.get(n.id) ?? n.doc!.is_visible_to_client, e)}
              />
            )
          )}
        </div>

        {/* Voile de dépôt externe */}
        {extDragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-primary-subtle/70 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2 text-primary">
              <CloudUpload className="h-8 w-8" />
              <p className="text-sm font-semibold">Déposez pour importer ici</p>
            </div>
          </div>
        )}

        {/* État vide */}
        {isEmpty && !extDragging && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <CloudUpload className="h-9 w-9 text-muted-foreground/60" />
            <p className="text-sm font-medium">
              {currentFolderId ? "Dossier vide" : "Espace vierge"}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Glissez vos fichiers ici, ou faites un clic droit pour créer un
              dossier.
            </p>
          </div>
        )}

        {/* Dock flottant */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-lg shadow-black/[0.06] backdrop-blur">
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full"
            onClick={() => {
              const vp = viewportRef.current!.getBoundingClientRect();
              setNewFolder(screenToWorld(vp.left + vp.width / 2, vp.top + vp.height / 3));
            }}
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Dossier</span>
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importer</span>
          </Button>
          <span className="mx-0.5 h-5 w-px bg-border" />
          <button type="button" aria-label="Dézoomer" onClick={() => zoomBy(1 / 1.2)} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">{Math.round(cam.zoom * 100)}%</span>
          <button type="button" aria-label="Zoomer" onClick={() => zoomBy(1.2)} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Ajuster" onClick={fitView} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {/* Remonter d'un niveau */}
        {currentFolderId && (
          <button
            type="button"
            onClick={() => navigateTo(breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2].id : null)}
            className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-accent"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            Remonter
          </button>
        )}
      </div>

      {/* File d'upload */}
      {uploads.length > 0 && (
        <ul className="space-y-1.5">
          {uploads.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", it.status === "error" ? "bg-destructive/10 text-destructive" : it.status === "done" ? "bg-success/10 text-success" : "bg-primary-subtle text-primary")}>
                {it.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : it.status === "error" ? <CircleAlert className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {it.status === "uploading" ? "Envoi…" : it.status === "done" ? "Ajouté" : it.message ?? "Échec"}
                </p>
              </div>
              {it.status !== "uploading" && (
                <button type="button" onClick={() => setUploads((u) => u.filter((x) => x.id !== it.id))} aria-label="Masquer" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {opError && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{opError}</p>}

      <ContextMenu state={menu} onClose={() => setMenu(null)} />

      <NameDialog
        open={newFolder !== null}
        onOpenChange={(o) => { if (!o) { setNewFolder(null); setOpError(null); } }}
        title="Nouveau dossier"
        label="Nom du dossier"
        submitLabel="Créer"
        error={opError}
        onSubmit={createFolderAt}
      />
      {renameFolder && (
        <NameDialog
          open
          onOpenChange={(o) => { if (!o) setRenameFolder(null); }}
          title="Renommer le dossier"
          label="Nom du dossier"
          initialValue={renameFolder.name}
          submitLabel="Renommer"
          onSubmit={doRenameFolder}
        />
      )}
      {editDoc && (
        <DocumentEditDialog doc={editDoc} workspaceId={workspaceId} open onOpenChange={(o) => { if (!o) setEditDoc(null); }} />
      )}
      {confirm && (
        <Dialog open onOpenChange={(o) => { if (!o) setConfirm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm.title}</DialogTitle>
              <DialogDescription>{confirm.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button>
              <Button variant="destructive" onClick={confirm.onConfirm}>Supprimer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// =============================================================================
function FolderNode({
  folder,
  pos,
  count,
  selected,
  isDropTarget,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onOpen,
  onMenu,
}: {
  folder: Folder;
  pos: Vec;
  count: number;
  selected: boolean;
  isDropTarget: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onOpen: () => void;
  onMenu: (e: ReactMouseEvent) => void;
}) {
  return (
    <div
      data-node
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      style={{ left: pos.x, top: pos.y, width: FOLDER_W, height: FOLDER_H }}
      className={cn(
        "group absolute flex select-none flex-col justify-between rounded-2xl border bg-gradient-to-b from-card to-muted/30 p-4 transition-shadow",
        isDropTarget
          ? "border-primary ring-2 ring-primary"
          : selected
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <svg width="34" height="34" viewBox="0 0 24 24" className="text-primary">
          <path
            fill="currentColor"
            fillOpacity="0.16"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            d="M3 6.5C3 5.4 3.9 4.5 5 4.5h4l2 2h8c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6.5Z"
          />
        </svg>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onMenu(e); }}
          aria-label="Actions"
          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div>
        <p className="truncate text-sm font-semibold" title={folder.name}>{folder.name}</p>
        <p className="text-xs text-muted-foreground">{count} élément{count > 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

// =============================================================================
function FileNode({
  doc,
  pos,
  visible,
  state,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onOpen,
  onToggleVisible,
  onMenu,
}: {
  doc: Document;
  pos: Vec;
  visible: boolean;
  state: ReturnType<typeof deriveDocumentState>;
  selected: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onOpen: () => void;
  onToggleVisible: () => void;
  onMenu: (e: ReactMouseEvent) => void;
}) {
  const cfg = DOCUMENT_STATE_CONFIG[state];
  const StateIcon = cfg.icon;
  return (
    <div
      data-node
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onOpen}
      onContextMenu={onMenu}
      style={{ left: pos.x, top: pos.y, width: FILE_W, height: FILE_H }}
      className={cn(
        "group absolute flex select-none flex-col rounded-2xl border bg-card p-4 transition-shadow",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <FileIcon filePath={doc.file_path} />
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onMenu(e); }}
          aria-label="Actions"
          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-sm font-medium leading-snug" title={doc.title}>
        {doc.title}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <StateIcon className="h-3 w-3" />
          {cfg.label}
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
          title={visible ? "Visible client — cliquer pour passer en privé" : "Privé — cliquer pour partager"}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full border transition active:scale-95",
            visible ? "border-primary/30 bg-primary-subtle text-primary" : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
