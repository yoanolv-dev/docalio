"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { FileIcon } from "@/components/documents/file-icon";
import {
  DocumentStatusBadge,
  DOCUMENT_STATUS_OPTIONS,
} from "@/components/documents/document-status-badge";
import {
  deleteDocumentAction,
  getDocumentDownloadUrl,
  updateDocumentAction,
  type DocumentFormState,
} from "@/lib/actions/documents";
import { fileTypeLabel, formatBytes, getFileExtension } from "@/lib/files";
import { formatDate } from "@/lib/utils";
import type { Document } from "@/lib/types/database";

function DocumentEditForm({
  document,
  workspaceId,
  onClose,
}: {
  document: Document;
  workspaceId: string;
  onClose: () => void;
}) {
  // Ferme le panneau d'édition une fois la mise à jour réussie.
  const [state, formAction, pending] = useActionState<
    DocumentFormState,
    FormData
  >(async (prev, formData) => {
    const result = await updateDocumentAction(prev, formData);
    if (result?.ok) onClose();
    return result;
  }, null);

  return (
    <form
      action={formAction}
      className="mt-3 space-y-4 rounded-lg border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="document_id" value={document.id} />
      <input type="hidden" name="workspace_id" value={workspaceId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`title-${document.id}`}>Titre</Label>
          <Input
            id={`title-${document.id}`}
            name="title"
            defaultValue={document.title}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`category-${document.id}`}>Catégorie</Label>
          <Input
            id={`category-${document.id}`}
            name="category"
            defaultValue={document.category ?? ""}
            placeholder="Devis, Facture..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`status-${document.id}`}>Statut</Label>
          <Select
            id={`status-${document.id}`}
            name="status"
            defaultValue={document.status}
          >
            {DOCUMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 pt-1 sm:pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_visible_to_client"
              defaultChecked={document.is_visible_to_client}
              className="h-4 w-4 rounded border-input"
            />
            Visible par le client
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="allow_download"
              defaultChecked={document.allow_download}
              className="h-4 w-4 rounded border-input"
            />
            Téléchargement autorisé
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`description-${document.id}`}>Description</Label>
        <Textarea
          id={`description-${document.id}`}
          name="description"
          defaultValue={document.description ?? ""}
          className="min-h-16"
        />
      </div>

      {state && !state.ok && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={pending}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

type SortKey = "recent" | "name" | "size";

export function DocumentList({
  documents,
  workspaceId,
}: {
  documents: Document[];
  workspaceId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  async function handleDownload(id: string) {
    setError(null);
    setDownloadingId(id);
    const result = await getDocumentDownloadUrl(id);
    setDownloadingId(null);
    if (result.ok) {
      window.location.assign(result.url);
    } else {
      setError(result.message);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = documents.filter((d) => {
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.category ?? "").toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "size") {
      sorted.sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return sorted;
  }, [documents, query, sort]);

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      {documents.length > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un document..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="sm:w-40"
          >
            <option value="recent">Plus récents</option>
            <option value="name">Nom (A→Z)</option>
            <option value="size">Taille</option>
          </Select>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun document ne correspond à votre recherche.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((doc) => {
          const ext = getFileExtension(doc.file_path);
          return (
            <li key={doc.id} className="py-3">
              <div className="flex items-start gap-3">
                <FileIcon filePath={doc.file_path} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <DocumentStatusBadge status={doc.status} />
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span>{fileTypeLabel(ext)}</span>
                    <span>·</span>
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>·</span>
                    <span>{formatDate(doc.created_at)}</span>
                    {doc.category && (
                      <>
                        <span>·</span>
                        <span>{doc.category}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span
                      className="inline-flex items-center gap-1"
                      title={
                        doc.is_visible_to_client
                          ? "Visible par le client"
                          : "Masqué pour le client"
                      }
                    >
                      {doc.is_visible_to_client ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      {doc.is_visible_to_client ? "Visible client" : "Masqué client"}
                    </span>
                    <span
                      className="inline-flex items-center gap-1"
                      title={
                        doc.allow_download
                          ? "Téléchargement autorisé"
                          : "Téléchargement désactivé"
                      }
                    >
                      <Download className="h-3.5 w-3.5" />
                      {doc.allow_download ? "Téléchargeable" : "Lecture seule"}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc.id)}
                    disabled={downloadingId === doc.id}
                    aria-label="Télécharger"
                    title="Télécharger"
                  >
                    {downloadingId === doc.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setEditingId(editingId === doc.id ? null : doc.id)
                    }
                    aria-label="Modifier"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteDialog
                    action={deleteDocumentAction}
                    fields={{ document_id: doc.id }}
                    title="Supprimer ce document ?"
                    description={`« ${doc.title} » et son fichier seront définitivement supprimés. Cette action est irréversible.`}
                    confirmLabel="Supprimer le document"
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Supprimer"
                        title="Supprimer"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>

              {editingId === doc.id && (
                <DocumentEditForm
                  document={doc}
                  workspaceId={workspaceId}
                  onClose={() => setEditingId(null)}
                />
              )}
            </li>
          );
        })}
        </ul>
      )}
    </div>
  );
}
