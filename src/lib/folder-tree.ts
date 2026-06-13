// Helpers d'arborescence purs (sans dépendance serveur) : utilisables aussi
// bien côté client (Drive) que serveur (actions). Aucune importation Supabase
// ici, sinon le bundle client embarquerait du code serveur.

import type { Folder } from "@/lib/types/database";

export interface BreadcrumbItem {
  id: string;
  name: string;
}

/**
 * Fil d'Ariane (du plus haut au dossier courant) à partir d'une liste plate.
 * Renvoie [] pour la racine. Tolère les références cassées sans boucler.
 */
export function buildBreadcrumb(
  folders: Folder[],
  folderId: string | null
): BreadcrumbItem[] {
  if (!folderId) return [];
  const byId = new Map(folders.map((f) => [f.id, f]));
  const trail: BreadcrumbItem[] = [];
  const seen = new Set<string>();
  let current = byId.get(folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    trail.unshift({ id: current.id, name: current.name });
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return trail;
}

/**
 * Ids de tous les descendants d'un dossier (inclus lui-même), à partir d'une
 * liste plate. Sert au déplacement (anti-cycle) et à la suppression récursive.
 */
export function collectDescendantIds(
  folders: Folder[],
  rootId: string
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const f of folders) {
    if (!f.parent_id) continue;
    const list = childrenOf.get(f.parent_id) ?? [];
    list.push(f.id);
    childrenOf.set(f.parent_id, list);
  }
  const result = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of childrenOf.get(id) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        stack.push(child);
      }
    }
  }
  return result;
}
