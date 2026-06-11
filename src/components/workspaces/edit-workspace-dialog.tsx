"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import {
  updateWorkspaceAction,
  type WorkspaceFormState,
} from "@/lib/actions/workspaces";
import type { Workspace } from "@/lib/types/database";

export function EditWorkspaceDialog({ workspace }: { workspace: Workspace }) {
  const [open, setOpen] = useState(false);

  // Ferme la modale une fois la mise à jour réussie.
  async function action(
    prev: WorkspaceFormState,
    formData: FormData
  ): Promise<WorkspaceFormState> {
    const result = await updateWorkspaceAction(prev, formData);
    if (result?.ok) setOpen(false);
    return result;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l&apos;espace</DialogTitle>
        </DialogHeader>
        <WorkspaceForm
          action={action}
          workspace={workspace}
          submitLabel="Enregistrer les modifications"
        />
      </DialogContent>
    </Dialog>
  );
}
