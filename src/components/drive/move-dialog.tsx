"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Folder as FolderIcon, House, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Folder } from "@/lib/types/database";

interface TreeNode {
  folder: Folder;
  depth: number;
}

/** Aplati l'arbre des dossiers en lignes indentées (DFS, ordre alphabétique). */
function flattenTree(folders: Folder[], excluded: Set<string>): TreeNode[] {
  const childrenOf = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parent_id ?? null;
    const list = childrenOf.get(key) ?? [];
    list.push(f);
    childrenOf.set(key, list);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const out: TreeNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const folder of childrenOf.get(parentId) ?? []) {
      if (excluded.has(folder.id)) continue;
      out.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/**
 * Sélecteur de destination : arborescence complète des dossiers + racine.
 * Les dossiers exclus (le dossier déplacé et ses descendants) n'apparaissent
 * pas — impossible de créer un cycle.
 */
export function MoveDialog({
  open,
  onOpenChange,
  folders,
  excludedIds,
  currentParentId,
  title,
  description,
  busy,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  excludedIds: Set<string>;
  currentParentId: string | null;
  title: string;
  description?: string;
  busy?: boolean;
  onMove: (targetFolderId: string | null) => void;
}) {
  const [target, setTarget] = useState<string | null>(currentParentId);
  const rows = useMemo(
    () => flattenTree(folders, excludedIds),
    [folders, excludedIds]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-1">
          <button
            type="button"
            onClick={() => setTarget(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
              target === null ? "bg-primary-subtle text-primary" : "hover:bg-accent"
            )}
          >
            <House className="h-4 w-4 shrink-0 opacity-70" />
            <span className="font-medium">Documents</span>
            <span className="text-xs text-muted-foreground">(racine)</span>
          </button>

          {rows.map(({ folder, depth }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setTarget(folder.id)}
              style={{ paddingLeft: `${depth * 16 + 10}px` }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg py-2 pr-2.5 text-left text-sm transition-colors",
                target === folder.id
                  ? "bg-primary-subtle text-primary"
                  : "hover:bg-accent"
              )}
            >
              {depth > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              )}
              <FolderIcon className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">{folder.name}</span>
            </button>
          ))}

          {rows.length === 0 && (
            <p className="px-2.5 py-3 text-center text-xs text-muted-foreground">
              Aucun autre dossier — créez-en un d&apos;abord.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => onMove(target)}
            disabled={busy || target === currentParentId}
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Déplacer ici
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
