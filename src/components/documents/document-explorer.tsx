"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  CheckCircle2,
  CircleAlert,
  CloudUpload,
  FileUp,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DocumentItem,
  type ExplorerView,
} from "@/components/documents/document-item";
import { uploadDocumentAction } from "@/lib/actions/documents";
import {
  deriveDocumentState,
  stateMatchesFilter,
  DOCUMENT_FILTERS,
  type DocumentFilter,
} from "@/lib/document-state";
import {
  FILE_ACCEPT_ATTRIBUTE,
  formatBytes,
  validateFile,
} from "@/lib/files";
import { formatStorage } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { Document, DocumentDecision } from "@/lib/types/database";

type SortKey = "recent" | "name" | "size";

interface UploadItem {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  message?: string;
}

interface DocumentExplorerProps {
  documents: Document[];
  workspaceId: string;
  decisions: Record<string, DocumentDecision>;
  viewedDocumentIds: string[];
  downloadedDocumentIds: string[];
  maxFileBytes: number;
}

/** File d'attente d'upload : feedback par fichier, sans fausse progression. */
function UploadQueue({
  items,
  onDismiss,
}: {
  items: UploadItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="animate-fade-up overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                item.status === "error"
                  ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                  : item.status === "done"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-primary-subtle text-primary"
              )}
            >
              {item.status === "done" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : item.status === "error" ? (
                <CircleAlert className="h-4 w-4" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {item.status === "uploading" && "Envoi en cours…"}
                {item.status === "done" && "Ajouté à l'espace"}
                {item.status === "error" && (item.message ?? "Échec de l'envoi")}
                {item.status !== "error" && ` · ${formatBytes(item.size)}`}
              </p>
            </div>
            {item.status !== "uploading" && (
              <button
                type="button"
                onClick={() => onDismiss(item.id)}
                aria-label="Masquer"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {item.status === "uploading" && (
            <div className="h-0.5 w-full overflow-hidden bg-primary-subtle">
              <div className="h-full w-1/3 rounded-full bg-primary animate-progress-slide" />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Explorateur de documents : drag & drop multi-fichiers, recherche, filtres
 * par état dérivé, tri, vue grille/liste. Le cœur de l'espace client.
 */
export function DocumentExplorer({
  documents,
  workspaceId,
  decisions,
  viewedDocumentIds,
  downloadedDocumentIds,
  maxFileBytes,
}: DocumentExplorerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DocumentFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<ExplorerView>("grid");

  const viewedSet = useMemo(
    () => new Set(viewedDocumentIds),
    [viewedDocumentIds]
  );
  const downloadedSet = useMemo(
    () => new Set(downloadedDocumentIds),
    [downloadedDocumentIds]
  );

  const stateOf = useCallback(
    (doc: Document) =>
      deriveDocumentState({
        isVisible: doc.is_visible_to_client,
        decision: decisions[doc.id]?.decision ?? null,
        viewed: viewedSet.has(doc.id),
        downloaded: downloadedSet.has(doc.id),
      }),
    [decisions, viewedSet, downloadedSet]
  );

  const filterCounts = useMemo(() => {
    const counts = new Map<DocumentFilter, number>();
    for (const f of DOCUMENT_FILTERS) {
      counts.set(
        f.value,
        documents.filter((d) => stateMatchesFilter(stateOf(d), f.value)).length
      );
    }
    return counts;
  }, [documents, stateOf]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = documents.filter((d) => {
      if (!stateMatchesFilter(stateOf(d), filter)) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.category ?? "").toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered];
    if (sort === "name") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "size")
      sorted.sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0));
    else
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    return sorted;
  }, [documents, query, filter, sort, stateOf]);

  // ---------------------------------------------------------------------------
  // Upload : validation immédiate puis envois séquentiels (quota fiable).
  // ---------------------------------------------------------------------------

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const queue: { id: string; file: File }[] = [];
      for (const file of files) {
        const id = crypto.randomUUID();
        const validationError = validateFile(file, maxFileBytes);
        if (validationError) {
          setUploads((u) => [
            ...u,
            {
              id,
              name: file.name,
              size: file.size,
              status: "error",
              message: validationError,
            },
          ]);
        } else {
          queue.push({ id, file });
          setUploads((u) => [
            ...u,
            { id, name: file.name, size: file.size, status: "uploading" },
          ]);
        }
      }

      for (const { id, file } of queue) {
        const formData = new FormData();
        formData.set("workspace_id", workspaceId);
        formData.set("file", file);
        let result: { ok: boolean; message?: string } | null = null;
        try {
          result = await uploadDocumentAction(null, formData);
        } catch {
          result = { ok: false, message: "L'envoi a échoué. Réessayez." };
        }
        setUploads((u) =>
          u.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: result?.ok ? "done" : "error",
                  message: result?.ok ? undefined : result?.message,
                }
              : item
          )
        );
        if (result?.ok) {
          // Les fichiers ajoutés disparaissent de la file après un instant.
          setTimeout(() => {
            setUploads((u) => u.filter((item) => item.id !== id));
          }, 4000);
        }
      }
    },
    [maxFileBytes, workspaceId]
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files ?? []));
  }

  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  const browse = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={FILE_ACCEPT_ATTRIBUTE}
      className="sr-only"
      onChange={(e) => {
        handleFiles(Array.from(e.target.files ?? []));
        e.target.value = "";
      }}
    />
  );

  const isEmpty = documents.length === 0;

  return (
    <div
      className="relative space-y-4"
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {browse}

      {/* Voile de dépôt : visible dès qu'un fichier survole la zone */}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary-subtle/80 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 text-primary">
            <CloudUpload className="h-8 w-8" />
            <p className="text-sm font-semibold">Déposez vos fichiers ici</p>
          </div>
        </div>
      )}

      {isEmpty ? (
        /* Premier dépôt : zone d'accueil généreuse */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-16 text-center transition-colors hover:border-primary/50 hover:bg-primary-subtle/40"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
            <CloudUpload className="h-6 w-6 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              Glissez-déposez vos premiers documents
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ou{" "}
              <span className="font-medium text-primary">
                parcourez vos fichiers
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF, Word, Excel, PowerPoint, image ou ZIP ·{" "}
            {formatStorage(maxFileBytes)} max par fichier
          </p>
        </button>
      ) : (
        <>
          {/* Bandeau de dépôt compact */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary-subtle/40 hover:text-foreground"
          >
            <CloudUpload className="h-4 w-4" />
            <span>
              Glissez vos fichiers ici ou{" "}
              <span className="font-medium text-primary">parcourir</span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · {formatStorage(maxFileBytes)} max
            </span>
          </button>

          <UploadQueue
            items={uploads}
            onDismiss={(id) =>
              setUploads((u) => u.filter((item) => item.id !== id))
            }
          />

          {/* Barre d'outils : recherche, tri, vue */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-36"
                aria-label="Trier les documents"
              >
                <option value="recent">Plus récents</option>
                <option value="name">Nom (A→Z)</option>
                <option value="size">Taille</option>
              </Select>
              <div className="flex rounded-md border border-input bg-card p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  aria-label="Vue grille"
                  aria-pressed={view === "grid"}
                  className={cn(
                    "flex h-7 w-8 items-center justify-center rounded transition-colors",
                    view === "grid"
                      ? "bg-primary-subtle text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  aria-label="Vue liste"
                  aria-pressed={view === "list"}
                  className={cn(
                    "flex h-7 w-8 items-center justify-center rounded transition-colors",
                    view === "list"
                      ? "bg-primary-subtle text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filtres par état (regroupements produit) */}
          <div className="flex flex-wrap gap-1.5">
            {DOCUMENT_FILTERS.map((f) => {
              const count = filterCounts.get(f.value) ?? 0;
              if (f.value !== "all" && count === 0) return null;
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all",
                    active
                      ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground"
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "tabular-nums",
                      active
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground/70"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Documents */}
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun document ne correspond à votre recherche.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Réinitialiser les filtres
              </Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {visible.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  workspaceId={workspaceId}
                  decision={decisions[doc.id] ?? null}
                  viewed={viewedSet.has(doc.id)}
                  downloaded={downloadedSet.has(doc.id)}
                  view="grid"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  workspaceId={workspaceId}
                  decision={decisions[doc.id] ?? null}
                  viewed={viewedSet.has(doc.id)}
                  downloaded={downloadedSet.has(doc.id)}
                  view="list"
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* File d'upload visible aussi pendant le tout premier dépôt */}
      {isEmpty && (
        <UploadQueue
          items={uploads}
          onDismiss={(id) =>
            setUploads((u) => u.filter((item) => item.id !== id))
          }
        />
      )}
    </div>
  );
}
