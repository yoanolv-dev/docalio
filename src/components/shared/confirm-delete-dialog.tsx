"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {pending ? "Suppression..." : label}
    </Button>
  );
}

interface ConfirmDeleteDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Server Action exécutée à la confirmation. */
  action: (formData: FormData) => void | Promise<void>;
  /** Champs cachés transmis à l'action (ids...). */
  fields: Record<string, string>;
}

/** Confirmation de suppression accessible, remplace window.confirm. */
export function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  confirmLabel = "Supprimer définitivement",
  action,
  fields,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={action}>
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Annuler
              </Button>
            </DialogClose>
            <ConfirmButton label={confirmLabel} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
