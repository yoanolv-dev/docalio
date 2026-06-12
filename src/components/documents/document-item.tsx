"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  MessageSquareQuote,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { FileIcon } from "@/components/documents/file-icon";
import { DocumentStateBadge } from "@/components/documents/document-state-badge";
import {
  deleteDocumentAction,
  getDocumentDownloadUrl,
  setDocumentDownloadAction,
  setDocumentVisibilityAction,
  updateDocumentAction,
  type DocumentFormState,
} from "@/lib/actions/documents";
import { deriveDocumentState } from "@/lib/document-state";
import { fileTypeLabel, formatBytes, getFileExtension } from "@/lib/files";
import { cn, formatDate } from "@/lib/utils";
import type { Document, DocumentDecision } from "@/lib/types/database";

export type ExplorerView = "grid" | "list";

interface DocumentItemProps {
  doc: Document;
  workspaceId: string;
  decision: DocumentDecision | null;
  viewed: boolean;
  downloaded: boolean;
  view: ExplorerView;
}

/** Dialog d'édition des métadonnées (titre, catégorie, description). */
function DocumentEditDialog({
  doc,
  workspaceId,
  open,
  onOpenChange,
}: {
  doc: Document;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState<
    DocumentFormState,
    FormData
  >(async (prev, formData) => {
    const result = await updateDocumentAction(prev, formData);
    if (result?.ok) onOpenChange(false);
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le document</DialogTitle>
          <DialogDescription>
            Le fichier reste inchangé — seules les informations affichées sont
            modifiées.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="document_id" value={doc.id} />
          <input type="hidden" name="workspace_id" value={workspaceId} />

          <div className="space-y-1.5">
            <Label htmlFor={`edit-title-${doc.id}`}>Titre</Label>
            <Input
              id={`edit-title-${doc.id}`}
              name="title"
              defaultValue={doc.title}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-category-${doc.id}`}>Catégorie</Label>
            <Input
              id={`edit-category-${doc.id}`}
              name="category"
              defaultValue={doc.category ?? ""}
              placeholder="Devis, Contrat, Rapport..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-description-${doc.id}`}>Description</Label>
            <Textarea
              id={`edit-description-${doc.id}`}
              name="description"
              defaultValue={doc.description ?? ""}
              placeholder="Visible par votre client dans le portail."
              className="min-h-16"
            />
          </div>

          {state && !state.ok && state.message && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Carte / ligne document de l'explorateur. La visibilité client et le
 * téléchargement se pilotent en un clic (optimiste), l'état affiché est
 * dérivé en temps réel.
 */
export function DocumentItem({
  doc,
  workspaceId,
  decision,
  viewed,
  downloaded,
  view,
}: DocumentItemProps) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Bascules optimistes : l'UI réagit immédiatement, le serveur confirme.
  const [optimisticVisible, setOptimisticVisible] = useState<boolean | null>(
    null
  );
  const [optimisticAllow, setOptimisticAllow] = useState<boolean | null>(null);
  const [visPending, startVisibility] = useTransition();
  const [dlPending, startDownloadToggle] = useTransition();

  // Réinitialise l'optimiste dès que la valeur serveur change (ajustement
  // pendant le rendu, cf. « you might not need an effect »).
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

  function toggleVisibility() {
    const next = !visible;
    setOptimisticVisible(next);
    setError(null);
    startVisibility(async () => {
      const r = await setDocumentVisibilityAction(doc.id, next);
      if (!r.ok) {
        setOptimisticVisible(null);
        setError(r.message ?? "Mise à jour impossible.");
      }
    });
  }

  function toggleDownload() {
    const next = !allowDownload;
    setOptimisticAllow(next);
    setError(null);
    startDownloadToggle(async () => {
      const r = await setDocumentDownloadAction(doc.id, next);
      if (!r.ok) {
        setOptimisticAllow(null);
        setError(r.message ?? "Mise à jour impossible.");
      }
    });
  }

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    const result = await getDocumentDownloadUrl(doc.id);
    setDownloading(false);
    if (result.ok) window.location.assign(result.url);
    else setError(result.message);
  }

  const ext = getFileExtension(doc.file_path);
  const meta = (
    <>
      <span>{fileTypeLabel(ext)}</span>
      <span aria-hidden>·</span>
      <span>{formatBytes(doc.file_size)}</span>
      <span aria-hidden>·</span>
      <span>{formatDate(doc.created_at)}</span>
    </>
  );

  const visibilityToggle = (
    <button
      type="button"
      onClick={toggleVisibility}
      disabled={visPending}
      title={
        visible
          ? "Visible dans le portail client — cliquer pour repasser en privé"
          : "Privé — cliquer pour partager avec le client"
      }
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all active:scale-[0.97]",
        visible
          ? "border-primary/25 bg-primary-subtle text-primary hover:border-primary/40"
          : "border-border bg-card text-muted-foreground hover:border-ring/60 hover:text-foreground"
      )}
    >
      {visPending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : visible ? (
        <Eye className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
      {visible ? "Visible client" : "Privé"}
    </button>
  );

  const downloadToggle = visible && (
    <button
      type="button"
      onClick={toggleDownload}
      disabled={dlPending}
      title={
        allowDownload
          ? "Téléchargement autorisé — cliquer pour passer en lecture seule"
          : "Lecture seule — cliquer pour autoriser le téléchargement"
      }
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all active:scale-[0.97]",
        allowDownload
          ? "border-border bg-card text-foreground/70 hover:border-ring/60"
          : "border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
      )}
    >
      {dlPending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : allowDownload ? (
        <Download className="h-3.5 w-3.5" />
      ) : (
        <Lock className="h-3.5 w-3.5" />
      )}
    </button>
  );

  const actions = (
    <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDownload}
        disabled={downloading}
        aria-label="Télécharger"
        title="Télécharger"
      >
        {downloading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setEditing(true)}
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
            size="icon-sm"
            aria-label="Supprimer"
            title="Supprimer"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );

  const editDialog = (
    <DocumentEditDialog
      doc={doc}
      workspaceId={workspaceId}
      open={editing}
      onOpenChange={setEditing}
    />
  );

  const comment = decision?.comment && (
    <p className="flex items-start gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
      <MessageSquareQuote className="mt-px h-3.5 w-3.5 shrink-0" />
      <span className="line-clamp-2">{decision.comment}</span>
    </p>
  );

  if (view === "list") {
    return (
      <div className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-all hover:border-ring/50 hover:shadow-sm">
        <FileIcon filePath={doc.file_path} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-sm font-medium" title={doc.title}>
              {doc.title}
            </p>
            <DocumentStateBadge state={state} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {meta}
            {doc.category && (
              <>
                <span aria-hidden>·</span>
                <span>{doc.category}</span>
              </>
            )}
          </p>
          {error && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          {visibilityToggle}
          {downloadToggle}
        </div>
        {actions}
        {editDialog}
      </div>
    );
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-md">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <FileIcon filePath={doc.file_path} />
          <DocumentStateBadge state={state} />
        </div>
        <div className="min-w-0">
          <p
            className="line-clamp-2 text-sm font-medium leading-snug"
            title={doc.title}
          >
            {doc.title}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {meta}
          </p>
          {doc.category && (
            <span className="mt-2 inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {doc.category}
            </span>
          )}
        </div>
        {comment}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          {visibilityToggle}
          {downloadToggle}
        </div>
        {actions}
      </div>
      {editDialog}
    </div>
  );
}
