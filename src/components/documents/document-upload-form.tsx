"use client";

import { useActionState, useRef, useState } from "react";
import { CloudUpload, Plus, X, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadDocumentAction,
  type DocumentFormState,
} from "@/lib/actions/documents";
import {
  FILE_ACCEPT_ATTRIBUTE,
  MAX_FILE_SIZE_MB,
  formatBytes,
  validateFile,
} from "@/lib/files";

export function DocumentUploadForm({ workspaceId }: { workspaceId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  // Après un upload réussi : on réinitialise et on referme le formulaire.
  const [state, formAction, pending] = useActionState<
    DocumentFormState,
    FormData
  >(async (prev, formData) => {
    const result = await uploadDocumentAction(prev, formData);
    if (result?.ok) {
      formRef.current?.reset();
      setSelectedFile(null);
      setFileError(null);
      setTitle("");
      setOpen(false);
    }
    return result;
  }, null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileError(file ? validateFile(file) : null);
    if (file && !title) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        {state?.ok && state.message ? (
          <p className="rounded-md bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            {state.message}
          </p>
        ) : (
          <span />
        )}
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un document
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-lg border border-[--color-border] bg-[--color-muted]/30 p-4"
    >
      <input type="hidden" name="workspace_id" value={workspaceId} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Nouveau document</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Zone de sélection de fichier */}
      <label
        htmlFor="file"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[--color-border] bg-[--color-background] px-4 py-8 text-center transition-colors hover:border-[--color-ring]"
      >
        <CloudUpload className="h-6 w-6 text-[--color-muted-foreground]" />
        {selectedFile ? (
          <div>
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-[--color-muted-foreground]">
              {formatBytes(selectedFile.size)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium">
              Cliquez pour sélectionner un fichier
            </p>
            <p className="text-xs text-[--color-muted-foreground]">
              PDF, Word, Excel, PowerPoint, image ou ZIP — {MAX_FILE_SIZE_MB} Mo
              max
            </p>
          </div>
        )}
        <input
          id="file"
          name="file"
          type="file"
          accept={FILE_ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          required
          className="sr-only"
        />
      </label>

      {fileError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {fileError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            name="title"
            placeholder="Devis n°2026-042"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Catégorie (optionnel)</Label>
          <Input
            id="category"
            name="category"
            placeholder="Devis, Facture, Rapport..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Contexte ou précisions pour votre équipe."
          className="min-h-16"
        />
      </div>

      {state && !state.ok && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={pending || !selectedFile || Boolean(fileError)}
        >
          {pending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer le document"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
