"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Clock,
  CornerDownLeft,
  CreditCard,
  Home,
  Link2,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { searchDriveAction } from "@/lib/actions/drive";
import type { SearchResults } from "@/lib/drive";
import { ItemIcon } from "@/components/drive/item-icon";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  item?: { kind: "folder" | "file"; name: string; mime?: string | null };
  keywords?: string;
  run: () => void;
}

/**
 * Palette Ctrl K : recherche instantanée dans les espaces, dossiers et
 * fichiers, et accès clavier à toutes les pages.
 */
export function CommandPalette({
  open,
  onOpenChange,
  guest = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const go = useMemo(
    () => (href: string) => () => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  const commands = useMemo<Entry[]>(() => {
    const all: (Entry & { member?: boolean })[] = [
      { id: "home", label: "Accueil du Drive", icon: Home, keywords: "accueil espaces drive", run: go("/dashboard") },
      { id: "recent", label: "Fichiers récents", icon: Clock, keywords: "récents derniers", run: go("/dashboard/recents") },
      { id: "new", label: "Nouvel espace", hint: "Créer", icon: Plus, keywords: "ajouter créer espace", run: go("/dashboard?nouveau=1"), member: true },
      { id: "links", label: "Liens de partage", icon: Link2, keywords: "partages liens", run: go("/dashboard/partages"), member: true },
      { id: "activity", label: "Journal d'activité", icon: Activity, keywords: "activité historique audit journal", run: go("/dashboard/activite"), member: true },
      { id: "trash", label: "Corbeille", icon: Trash2, keywords: "corbeille supprimés restaurer", run: go("/dashboard/corbeille") },
      { id: "team", label: "Équipe et invités", icon: Users, keywords: "utilisateurs membres invitation rôles groupes", run: go("/dashboard/settings/equipe"), member: true },
      { id: "security", label: "Sécurité et double authentification", icon: ShieldCheck, keywords: "2fa mot de passe sécurité", run: go("/dashboard/settings/securite") },
      { id: "billing", label: "Abonnement", icon: CreditCard, keywords: "plan facturation stockage offre", run: go("/dashboard/settings/abonnement"), member: true },
      { id: "settings", label: "Paramètres de l'organisation", icon: Settings, keywords: "organisation logo identité", run: go("/dashboard/settings/organisation"), member: true },
      {
        id: "signout",
        label: "Déconnexion",
        icon: LogOut,
        keywords: "quitter sortir",
        run: async () => {
          onOpenChange(false);
          await createClient().auth.signOut();
          router.push("/login");
          router.refresh();
        },
      },
    ];
    return all.filter((c) => !guest || !c.member);
  }, [go, guest, onOpenChange, router]);

  const trimmed = query.trim();

  // Recherche instantanée (après une courte pause de frappe).
  useEffect(() => {
    if (!open || trimmed.length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setLoading(true);
      const r = await searchDriveAction(trimmed);
      if (!cancelled) {
        setResults(r);
        setLoading(false);
      }
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, trimmed]);

  const entries = useMemo<Entry[]>(() => {
    const q = trimmed.toLowerCase();
    const cmds = q ? commands.filter((c) => c.label.toLowerCase().includes(q) || (c.keywords ?? "").includes(q)) : commands;
    if (trimmed.length < 2 || !results || results.query !== trimmed) return cmds;
    const found: Entry[] = [
      ...results.spaces.map((s) => ({
        id: `s:${s.id}`,
        label: s.name,
        hint: "Espace",
        item: { kind: "folder" as const, name: s.name },
        run: go(`/dashboard/workspaces/${s.id}`),
      })),
      ...results.folders.map((f) => ({
        id: `d:${f.id}`,
        label: f.name,
        hint: [f.workspace_name, f.location].filter(Boolean).join(" › "),
        item: { kind: "folder" as const, name: f.name },
        run: go(`/dashboard/workspaces/${f.workspace_id}?dossier=${f.id}`),
      })),
      ...results.files.map((f) => ({
        id: `f:${f.id}`,
        label: f.name,
        hint: [f.workspace_name, f.location].filter(Boolean).join(" › "),
        item: { kind: "file" as const, name: f.name, mime: f.file_type },
        run: go(`/dashboard/workspaces/${f.workspace_id}?${f.folder_id ? `dossier=${f.folder_id}&` : ""}apercu=${f.id}`),
      })),
      {
        id: "all",
        label: `Tous les résultats pour « ${trimmed} »`,
        icon: Search,
        run: go(`/dashboard/recherche?q=${encodeURIComponent(trimmed)}`),
      },
    ];
    return [...found, ...cmds];
  }, [commands, results, trimmed, go]);

  // Réinitialisation à l'ouverture et quand la requête change (pendant le rendu).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
      setResults(null);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActive(0);
  }

  // Raccourci global Ctrl K / ⌘K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, entries.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (entries[active]) entries[active].run();
      else if (trimmed.length >= 2) go(`/dashboard/recherche?q=${encodeURIComponent(trimmed)}`)();
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }

  const searching = trimmed.length >= 2 && (loading || !results || results.query !== trimmed);

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/30 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="animate-scale-in w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Recherche"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          {searching ? (
            <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onListKey}
            placeholder="Rechercher un fichier, un dossier, un espace…"
            className="h-13 w-full bg-transparent py-4 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ÉCHAP
          </kbd>
        </div>
        <ul ref={listRef} className="max-h-[60vh] overflow-y-auto p-1.5">
          {entries.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {searching ? "Recherche…" : "Aucun résultat"}
            </li>
          )}
          {entries.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={c.run}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    i === active ? "bg-accent" : "hover:bg-accent/60"
                  )}
                >
                  {c.item ? (
                    <ItemIcon kind={c.item.kind} name={c.item.name} mime={c.item.mime} size="sm" />
                  ) : Icon ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.label}</span>
                    {c.item && c.hint && <span className="block truncate text-xs text-muted-foreground">{c.hint}</span>}
                  </span>
                  {!c.item && c.hint && <span className="text-xs text-muted-foreground">{c.hint}</span>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
