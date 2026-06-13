"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
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
import {
  updateDocumentAction,
  type DocumentFormState,
} from "@/lib/actions/documents";
import type { Document } from "@/lib/types/database";

/** Édition des métadonnées d'un document (titre, catégorie, description). */
export function DocumentEditDialog({
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
          <DialogTitle>Renommer le document</DialogTitle>
          <DialogDescription>
            Le fichier reste inchangé — seules les informations affichées sont
            modifiées.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="document_id" value={doc.id} />
          <input type="hidden" name="workspace_id" value={workspaceId} />

          <div className="space-y-1.5">
            <Label htmlFor={`edit-title-${doc.id}`}>Nom</Label>
            <Input
              id={`edit-title-${doc.id}`}
              name="title"
              defaultValue={doc.title}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-category-${doc.id}`}>Catégorie</Label>
            <Input
              id={`edit-category-${doc.id}`}
              name="category"
              defaultValue={doc.category ?? ""}
              placeholder="Devis, Contrat, Rapport…"
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
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
