"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ItemIcon } from "@/components/drive/item-icon";
import { emptyTrashAction, purgeItemsAction, restoreItemsAction } from "@/lib/actions/drive";
import type { TrashEntry } from "@/lib/drive";
import { formatBytes } from "@/lib/files";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

/** Corbeille : restaurer, supprimer définitivement, vider. */
export function TrashView({ items }: { items: TrashEntry[] }) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<"selection" | "all" | null>(null);
  const [pending, start] = useTransition();

  const key = (i: TrashEntry) => `${i.kind}:${i.id}`;
  const chosen = items.filter((i) => selected.has(key(i)));
  const ids = (list: TrashEntry[]) => ({
    folderIds: list.filter((i) => i.kind === "folder").map((i) => i.id),
    documentIds: list.filter((i) => i.kind === "file").map((i) => i.id),
  });
  const total = items.reduce((s, i) => s + i.size, 0);

  function restore(list: TrashEntry[]) {
    start(async () => {
      const r = await restoreItemsAction(ids(list));
      if (r.ok) {
        setSelected(new Set());
        toast.show(list.length === 1 ? `« ${list[0].name} » restauré.` : `${list.length} éléments restaurés.`);
      } else toast.error(r.message);
    });
  }

  function purge() {
    const scope = confirm;
    setConfirm(null);
    start(async () => {
      const r = scope === "all" ? await emptyTrashAction() : await purgeItemsAction(ids(chosen));
      if (r.ok) {
        setSelected(new Set());
        toast.show(scope === "all" ? "Corbeille vidée." : "Supprimé définitivement.");
      } else toast.error(r.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} élément{items.length > 1 ? "s" : ""} · {formatBytes(total)} · supprimés définitivement après 30 jours
        </p>
        <div className="flex gap-2">
          {chosen.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => restore(chosen)} disabled={pending}>
                <RotateCcw className="h-4 w-4" />
                Restaurer ({chosen.length})
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm("selection")} disabled={pending}>
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </>
          )}
          {items.length > 0 && chosen.length === 0 && (
            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirm("all")} disabled={pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Vider la corbeille
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Trash2 className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold">La corbeille est vide</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Les fichiers et dossiers supprimés restent ici 30 jours : vous pouvez les restaurer en un clic.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {items.map((i) => {
            const on = selected.has(key(i));
            return (
              <li key={key(i)} className={cn("flex items-center gap-3 px-4 py-2.5", on && "bg-primary-subtle")}>
                <input
                  type="checkbox"
                  checked={on}
                  aria-label={`Sélectionner ${i.name}`}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (n.has(key(i))) n.delete(key(i));
                      else n.add(key(i));
                      return n;
                    })
                  }
                  className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                />
                <ItemIcon kind={i.kind} name={i.name} mime={i.file_type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.name}</p>
                  <p suppressHydrationWarning className="truncate text-xs text-muted-foreground">
                    {i.workspace_name} · supprimé {formatRelativeTime(i.deleted_at).replace(/^I/, "i")}
                    {i.deleted_by_name ? ` par ${i.deleted_by_name}` : ""}
                  </p>
                </div>
                <span suppressHydrationWarning className="hidden w-32 shrink-0 text-xs text-muted-foreground md:block">
                  Jusqu&apos;au {formatDate(i.purge_at)}
                </span>
                <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">{formatBytes(i.size)}</span>
                <Button size="sm" variant="ghost" onClick={() => restore([i])} disabled={pending}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Restaurer</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogTitle>
            {confirm === "all" ? "Vider la corbeille ?" : `Supprimer définitivement ${chosen.length > 1 ? `${chosen.length} éléments` : "cet élément"} ?`}
          </DialogTitle>
          <DialogDescription>
            Les fichiers et toutes leurs versions seront effacés pour de bon. Cette action est irréversible.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={purge}>
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
