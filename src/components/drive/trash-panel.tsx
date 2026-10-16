"use client";

import { useState, useTransition } from "react";
import {
  ArchiveRestore,
  Folder,
  LoaderCircle,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileIcon } from "@/components/documents/file-icon";
import {
  emptyTrashAction,
  purgeItemsAction,
  restoreItemsAction,
} from "@/lib/actions/drive";
import { formatBytes } from "@/lib/files";
import { formatRelativeTime } from "@/lib/utils";
import type { DriveTrashItem } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Corbeille d'un espace : tout élément supprimé y reste 30 jours, restaurable
// d'un clic (un dossier revient avec tout son contenu).
// ---------------------------------------------------------------------------

export function TrashPanel({
  workspaceId,
  items,
  onBack,
}: {
  workspaceId: string;
  items: DriveTrashItem[];
  onBack: () => void;
}) {
  const [confirm, setConfirm] = useState<
    | { type: "purge"; item: DriveTrashItem }
    | { type: "empty" }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function restore(item: DriveTrashItem) {
    setError(null);
    startTransition(async () => {
      const r = await restoreItemsAction(
        workspaceId,
        item.kind === "folder" ? [item.id] : [],
        item.kind === "file" ? [item.id] : []
      );
      if (!r.ok) setError(r.message ?? "Restauration impossible.");
    });
  }

  function purge(item: DriveTrashItem) {
    setError(null);
    startTransition(async () => {
      const r = await purgeItemsAction(
        workspaceId,
        item.kind === "folder" ? [item.id] : [],
        item.kind === "file" ? [item.id] : []
      );
      if (!r.ok) setError(r.message ?? "Suppression impossible.");
      setConfirm(null);
    });
  }

  function emptyAll() {
    setError(null);
    startTransition(async () => {
      const r = await emptyTrashAction(workspaceId);
      if (!r.ok) setError(r.message ?? "Suppression impossible.");
      setConfirm(null);
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8" onClick={onBack}>
            <Undo2 className="h-4 w-4" />
            Retour aux fichiers
          </Button>
          <span className="text-sm font-medium">
            Corbeille
            <span className="ml-1.5 font-normal text-muted-foreground">
              · {items.length} élément{items.length > 1 ? "s" : ""}
            </span>
          </span>
        </div>
        {items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirm({ type: "empty" })}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
            Vider la corbeille
          </Button>
        )}
      </div>

      {error && (
        <p className="shrink-0 border-b border-border bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
            <Trash2 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">La corbeille est vide</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Les éléments supprimés y restent 30 jours avant d&apos;être
              définitivement effacés.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <li
                key={`${item.kind}:${item.id}`}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                {item.kind === "folder" ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                    <Folder className="h-[18px] w-[18px]" />
                  </span>
                ) : (
                  <span className="[&>div]:h-9 [&>div]:w-9 [&_svg]:h-4 [&_svg]:w-4">
                    <FileIcon filePath={item.name} fileType={item.file_type} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.kind === "folder" ? "Dossier" : formatBytes(item.size)} ·
                    supprimé {formatRelativeTime(item.deleted_at).toLowerCase()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => restore(item)}
                  disabled={busy}
                >
                  {busy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArchiveRestore className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Restaurer</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirm({ type: "purge", item })}
                  disabled={busy}
                  title="Supprimer définitivement"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirm && (
        <Dialog open onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm.type === "empty"
                  ? "Vider la corbeille ?"
                  : `Supprimer définitivement ?`}
              </DialogTitle>
              <DialogDescription>
                {confirm.type === "empty"
                  ? "Tous les éléments de la corbeille seront définitivement effacés. Cette action est irréversible."
                  : `« ${confirm.item.name} » sera définitivement effacé${confirm.item.kind === "folder" ? ", avec tout son contenu" : ""}. Cette action est irréversible.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  confirm.type === "empty" ? emptyAll() : purge(confirm.item)
                }
              >
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Supprimer définitivement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
