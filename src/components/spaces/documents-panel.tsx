"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  FolderTree,
  List,
  LoaderCircle,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Unlock,
} from "lucide-react";
import { FileIcon } from "@/components/documents/file-icon";
import { DocumentEditDialog } from "@/components/documents/document-edit-dialog";
import { ExplorerDrive } from "@/components/drive/explorer-drive";
import {
  deleteDocumentAction,
  getDocumentDownloadUrl,
  setDocumentDownloadAction,
  setDocumentVisibilityAction,
  uploadDocumentAction,
} from "@/lib/actions/documents";
import { DOCUMENT_STATE_CONFIG, deriveDocumentState } from "@/lib/document-state";
import { FILE_ACCEPT_ATTRIBUTE, formatBytes, validateFile } from "@/lib/files";
import { cn, formatDate } from "@/lib/utils";
import type { Document, DocumentDecision, Folder } from "@/lib/types/database";

const VIEW_KEY = "docalio:documents-view";
const VIEW_EVENT = "docalio:documents-view";

// Préférence d'affichage (vue dossiers = option avancée), lue dans le
// navigateur sans décalage d'hydratation : le serveur rend toujours la liste.
function subscribeView(cb: () => void) {
  window.addEventListener(VIEW_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(VIEW_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function readView(): "list" | "folders" {
  try {
    return localStorage.getItem(VIEW_KEY) === "folders" ? "folders" : "list";
  } catch {
    return "list";
  }
}

const STATE_TONE: Record<string, string> = {
  private: "bg-muted text-muted-foreground",
  shared: "bg-primary-subtle text-primary",
  viewed: "bg-sky-50 text-sky-700",
  downloaded: "bg-violet-50 text-violet-700",
  approved: "bg-emerald-50 text-emerald-700",
  changes_requested: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
};

type Upload = { id: string; name: string; error?: string };

/**
 * Documents partagés avec le client : une liste simple (glisser-déposer,
 * état réel de chaque document, menu d'actions). L'organisation en dossiers
 * reste disponible en option pour ceux qui en ont besoin.
 */
export function DocumentsPanel({
  documents,
  folders,
  workspaceId,
  decisions,
  viewedDocumentIds,
  downloadedDocumentIds,
  maxFileBytes,
  internal = false,
}: {
  documents: Document[];
  folders: Folder[];
  workspaceId: string;
  decisions: Record<string, DocumentDecision>;
  viewedDocumentIds: string[];
  downloadedDocumentIds: string[];
  maxFileBytes: number;
  internal?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const view = useSyncExternalStore(subscribeView, readView, () => "list" as const);
  const [drag, setDrag] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function switchView(v: "list" | "folders") {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
    window.dispatchEvent(new Event(VIEW_EVENT));
  }

  const viewed = new Set(viewedDocumentIds);
  const downloaded = new Set(downloadedDocumentIds);
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  const sorted = [...documents].sort((a, b) => b.created_at.localeCompare(a.created_at));

  async function upload(files: File[]) {
    if (!files.length) return;
    setError(null);
    const queue = files.map((file) => ({ id: crypto.randomUUID(), file }));
    setUploads((u) => [
      ...queue.map(({ id, file }) => ({ id, name: file.name, error: validateFile(file, maxFileBytes) ?? undefined })),
      ...u,
    ]);
    let ok = false;
    let i = 0;
    const worker = async () => {
      while (i < queue.length) {
        const { id, file } = queue[i++];
        if (validateFile(file, maxFileBytes)) continue;
        const fd = new FormData();
        fd.set("workspace_id", workspaceId);
        fd.set("file", file);
        let r: { ok: boolean; message?: string } | null;
        try {
          r = await uploadDocumentAction(null, fd);
        } catch {
          r = { ok: false, message: "L'envoi a échoué." };
        }
        if (r?.ok) {
          ok = true;
          setUploads((u) => u.filter((x) => x.id !== id));
        } else {
          setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: r?.message ?? "Échec" } : x)));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));
    if (ok) router.refresh();
  }

  function act(fn: () => Promise<{ ok: boolean; message?: string } | void>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r && !r.ok) setError(r.message ?? "Action impossible.");
      router.refresh();
    });
  }

  async function download(id: string) {
    const r = await getDocumentDownloadUrl(id);
    if (r.ok) window.location.assign(r.url);
    else setError(r.message);
  }

  const toggle = (
    <div className="flex rounded-lg bg-canvas p-0.5">
      {(
        [
          { v: "list", icon: List, label: "Liste" },
          { v: "folders", icon: FolderTree, label: "Dossiers" },
        ] as const
      ).map(({ v, icon: Icon, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => switchView(v)}
          aria-pressed={view === v}
          title={v === "folders" ? "Organiser en dossiers" : "Vue simple"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            view === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );

  if (view === "folders") {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{toggle}</div>
        <div className="h-[min(70vh,720px)] min-h-[440px]">
          <ExplorerDrive
            documents={documents}
            folders={folders}
            workspaceId={workspaceId}
            decisions={decisions}
            viewedDocumentIds={viewedDocumentIds}
            downloadedDocumentIds={downloadedDocumentIds}
            maxFileBytes={maxFileBytes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(Array.from(e.dataTransfer.files ?? []));
        }}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 transition-colors",
          drag ? "border-primary bg-primary-subtle" : "border-border bg-canvas/40"
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-border">
          <CloudUpload className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Glissez vos fichiers ici ou{" "}
          <button type="button" onClick={() => input.current?.click()} className="font-medium text-primary hover:underline">
            parcourez
          </button>
        </p>
        {toggle}
        <input
          ref={input}
          type="file"
          multiple
          accept={FILE_ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {sorted.length === 0 && uploads.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          {internal
            ? "Aucun document pour l'instant."
            : "Aucun document partagé. Déposez un devis, un bilan ou un contrat : votre client le verra dans son espace."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {uploads.map((u) => (
            <li key={u.id} className="flex items-center gap-3 bg-white px-3.5 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {u.error ? <Trash2 className="h-4 w-4 text-red-500" /> : <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{u.name}</span>
                <span className={cn("block text-xs", u.error ? "text-red-600" : "text-muted-foreground")}>
                  {u.error ?? "Envoi en cours…"}
                </span>
              </span>
              {u.error && (
                <button type="button" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))} className="text-xs text-muted-foreground hover:text-foreground">
                  Fermer
                </button>
              )}
            </li>
          ))}
          {sorted.map((doc) => {
            const state = deriveDocumentState({
              isVisible: doc.is_visible_to_client,
              decision: decisions[doc.id]?.decision ?? null,
              viewed: viewed.has(doc.id),
              downloaded: downloaded.has(doc.id),
            });
            const cfg = DOCUMENT_STATE_CONFIG[state];
            const comment = decisions[doc.id]?.comment;
            return (
              <li key={doc.id} className="group flex items-center gap-3 bg-white px-3.5 py-2.5 transition-colors hover:bg-canvas/40">
                <FileIcon filePath={doc.file_path} />
                <button type="button" onClick={() => download(doc.id)} className="min-w-0 flex-1 text-left" title="Télécharger">
                  <span className="block truncate text-sm font-medium">{doc.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {doc.folder_id && folderName.get(doc.folder_id) ? `${folderName.get(doc.folder_id)} · ` : ""}
                    {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                    {!doc.allow_download && doc.is_visible_to_client ? " · consultation seule" : ""}
                    {comment ? ` · « ${comment} »` : ""}
                  </span>
                </button>
                {!internal && (
                  <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline", STATE_TONE[state])}>
                    {cfg.label}
                  </span>
                )}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      aria-label={`Actions pour ${doc.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-canvas hover:text-foreground data-[state=open]:bg-canvas"
                    >
                      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={4}
                      className="animate-menu-in z-[60] w-60 rounded-xl border border-border bg-popover p-1 shadow-lg"
                    >
                      <MenuItem icon={Download} onSelect={() => download(doc.id)}>Télécharger</MenuItem>
                      <MenuItem icon={Pencil} onSelect={() => setEditDoc(doc)}>Renommer</MenuItem>
                      {!internal && (
                        <>
                          <DropdownMenu.Separator className="my-1 h-px bg-border" />
                          <MenuItem
                            icon={doc.is_visible_to_client ? EyeOff : Eye}
                            onSelect={() => act(() => setDocumentVisibilityAction(doc.id, !doc.is_visible_to_client))}
                          >
                            {doc.is_visible_to_client ? "Masquer au client" : "Montrer au client"}
                          </MenuItem>
                          {doc.is_visible_to_client && (
                            <MenuItem
                              icon={doc.allow_download ? Lock : Unlock}
                              onSelect={() => act(() => setDocumentDownloadAction(doc.id, !doc.allow_download))}
                            >
                              {doc.allow_download ? "Consultation seule" : "Autoriser le téléchargement"}
                            </MenuItem>
                          )}
                        </>
                      )}
                      <DropdownMenu.Separator className="my-1 h-px bg-border" />
                      <MenuItem icon={Trash2} destructive onSelect={() => setConfirmDelete(doc)}>Supprimer</MenuItem>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </li>
            );
          })}
        </ul>
      )}

      {editDoc && (
        <DocumentEditDialog
          doc={editDoc}
          workspaceId={workspaceId}
          open={!!editDoc}
          onOpenChange={(o) => !o && setEditDoc(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <div className="animate-dialog-in w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
            <p className="font-semibold">Supprimer « {confirmDelete.title} » ?</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Le fichier sera définitivement supprimé, y compris de l&apos;espace de votre client.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirmDelete.id;
                  setConfirmDelete(null);
                  act(async () => {
                    const fd = new FormData();
                    fd.set("document_id", id);
                    await deleteDocumentAction(fd);
                  });
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onSelect,
  destructive = false,
}: {
  icon: typeof Download;
  children: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors",
        destructive
          ? "text-red-600 data-[highlighted]:bg-red-50"
          : "data-[highlighted]:bg-canvas"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      {children}
    </DropdownMenu.Item>
  );
}
