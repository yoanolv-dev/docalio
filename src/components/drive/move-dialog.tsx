"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FolderInput, Home, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemIcon } from "@/components/drive/item-icon";
import { collectDescendantIds } from "@/lib/folder-tree";
import type { FolderNode } from "@/lib/drive";
import { cn } from "@/lib/utils";

/**
 * Choix d'un dossier de destination dans l'espace : arborescence dépliable,
 * dossiers interdits grisés (un dossier ne peut pas aller dans lui-même).
 */
export function MoveDialog({
  open,
  onOpenChange,
  spaceName,
  tree,
  movingFolderIds,
  currentFolderId,
  count,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceName: string;
  tree: FolderNode[];
  movingFolderIds: string[];
  currentFolderId: string | null;
  count: number;
  onConfirm: (targetFolderId: string | null) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(currentFolderId);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setSelected(currentFolderId);
      // Déplie le chemin du dossier courant.
      const byId = new Map(tree.map((f) => [f.id, f]));
      const path = new Set<string>();
      let cur = currentFolderId ? byId.get(currentFolderId) : undefined;
      while (cur) {
        path.add(cur.id);
        cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
      }
      setExpanded(path);
    }
  }

  const children = useMemo(() => {
    const map = new Map<string | null, FolderNode[]>();
    for (const f of tree) {
      const list = map.get(f.parent_id ?? null) ?? [];
      list.push(f);
      map.set(f.parent_id ?? null, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return map;
  }, [tree]);

  const forbidden = useMemo(() => {
    const out = new Set<string>();
    for (const id of movingFolderIds) for (const d of collectDescendantIds(tree, id)) out.add(d);
    return out;
  }, [tree, movingFolderIds]);

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function renderLevel(parent: string | null, depth: number): React.ReactNode {
    const list = children.get(parent) ?? [];
    return list.map((f) => {
      const blocked = forbidden.has(f.id);
      const hasKids = (children.get(f.id) ?? []).length > 0;
      const isOpen = expanded.has(f.id);
      return (
        <div key={f.id}>
          <div
            className={cn(
              "flex items-center gap-1 rounded-lg pr-2 transition-colors",
              selected === f.id ? "bg-primary-subtle text-primary" : !blocked && "hover:bg-canvas",
              blocked && "opacity-40"
            )}
            style={{ paddingLeft: 8 + depth * 18 }}
          >
            <button
              type="button"
              onClick={() => hasKids && toggle(f.id)}
              className={cn("rounded p-1 text-muted-foreground", !hasKids && "invisible")}
              aria-label={isOpen ? "Replier" : "Déplier"}
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
            </button>
            <button
              type="button"
              disabled={blocked}
              onClick={() => setSelected(f.id)}
              onDoubleClick={() => hasKids && toggle(f.id)}
              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm"
            >
              <ItemIcon kind="folder" size="sm" />
              <span className="truncate">{f.name}</span>
            </button>
          </div>
          {isOpen && renderLevel(f.id, depth + 1)}
        </div>
      );
    });
  }

  const unchanged = selected === currentFolderId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0">
        <div className="px-6 pb-3 pt-6">
          <DialogTitle>Déplacer {count > 1 ? `${count} éléments` : "l'élément"}</DialogTitle>
          <DialogDescription className="mt-1">Choisissez le dossier de destination.</DialogDescription>
        </div>
        <div className="mx-3 max-h-80 overflow-y-auto rounded-xl border border-border p-1.5">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors",
              selected === null ? "bg-primary-subtle text-primary" : "hover:bg-canvas"
            )}
          >
            <Home className="h-4 w-4" />
            <span className="truncate">{spaceName}</span>
            <span className="ml-auto text-xs font-normal text-muted-foreground">racine</span>
          </button>
          {renderLevel(null, 0)}
          {tree.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Aucun dossier dans cet espace pour l&apos;instant.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button
            disabled={busy || unchanged}
            onClick={async () => {
              setBusy(true);
              await onConfirm(selected);
              setBusy(false);
            }}
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FolderInput className="h-4 w-4" />}
            Déplacer ici
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
