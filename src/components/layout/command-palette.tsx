"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderClosed,
  Plus,
  Bell,
  Settings,
  Users,
  CreditCard,
  LogOut,
  CornerDownLeft,
  FileText,
  Folder,
  LoaderCircle,
  Search,
  type LucideIcon,
} from "lucide-react";
import { searchDriveAction, type SearchResults } from "@/lib/actions/drive";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  label: string;
  sub?: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  group: "commands" | "spaces" | "folders" | "files";
  run: () => void;
}

const GROUP_LABELS: Record<Entry["group"], string> = {
  commands: "Actions",
  spaces: "Espaces",
  folders: "Dossiers",
  files: "Fichiers",
};

/**
 * Palette de commandes (Ctrl K / ⌘K) — navigation + recherche instantanée
 * dans tous les espaces, dossiers et fichiers accessibles.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<SearchResults | null>(null);
  const searchSeq = useRef(0);
  // « Recherche en cours » est dérivé : requête active sans résultats reçus.
  const searching = open && query.trim().length >= 2 && results === null;

  const commands = useMemo<Entry[]>(() => {
    const go = (href: string) => () => {
      onOpenChange(false);
      router.push(href);
    };
    return [
      { id: "spaces", label: "Espaces", icon: FolderClosed, keywords: "accueil dossiers clients liste à traiter", group: "commands", run: go("/dashboard") },
      { id: "new", label: "Nouvel espace", hint: "Créer", icon: Plus, keywords: "ajouter créer", group: "commands", run: go("/dashboard?nouveau=1") },
      { id: "notifs", label: "Activité & notifications", icon: Bell, keywords: "activité alertes", group: "commands", run: go("/dashboard/notifications") },
      { id: "team", label: "Équipe & accès", hint: "Inviter", icon: Users, keywords: "utilisateurs membres invitation rôles collaborateurs groupes", group: "commands", run: go("/dashboard/settings/equipe") },
      { id: "billing", label: "Abonnement", icon: CreditCard, keywords: "plan facturation paiement usage offre stockage", group: "commands", run: go("/dashboard/settings/abonnement") },
      { id: "settings", label: "Paramètres", icon: Settings, keywords: "organisation compte identité logo", group: "commands", run: go("/dashboard/settings/organisation") },
      {
        id: "signout",
        label: "Déconnexion",
        icon: LogOut,
        keywords: "quitter logout sortir",
        group: "commands",
        run: async () => {
          onOpenChange(false);
          const supabase = createClient();
          await supabase.auth.signOut();
          router.push("/login");
          router.refresh();
        },
      },
    ];
  }, [router, onOpenChange]);

  // Recherche serveur avec anti-rebond : espaces, dossiers et fichiers.
  // Les résultats sont remis à zéro au changement de requête (ajustement
  // pendant le rendu, plus bas) ; l'effet ne fait que lancer l'appel.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) return;
    const seq = ++searchSeq.current;
    const t = window.setTimeout(async () => {
      const r = await searchDriveAction(q);
      if (searchSeq.current === seq) setResults(r);
    }, 180);
    return () => window.clearTimeout(t);
  }, [query, open]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase();
    const go = (href: string) => () => {
      onOpenChange(false);
      router.push(href);
    };
    const matchedCommands = q
      ? commands.filter(
          (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? "").includes(q)
        )
      : commands;

    const list: Entry[] = [...matchedCommands];
    if (results) {
      for (const w of results.workspaces) {
        list.push({
          id: `ws-${w.id}`,
          label: w.name,
          sub: w.space_type === "internal" ? "Espace interne" : "Espace client",
          icon: FolderClosed,
          group: "spaces",
          run: go(`/dashboard/workspaces/${w.id}`),
        });
      }
      for (const f of results.folders) {
        list.push({
          id: `folder-${f.id}`,
          label: f.name,
          sub: f.workspace_name,
          icon: Folder,
          group: "folders",
          run: go(`/dashboard/workspaces/${f.workspace_id}?dossier=${f.id}`),
        });
      }
      for (const d of results.documents) {
        list.push({
          id: `doc-${d.id}`,
          label: d.title,
          sub: d.workspace_name,
          icon: FileText,
          group: "files",
          run: go(`/dashboard/workspaces/${d.workspace_id}?fichier=${d.id}`),
        });
      }
    }
    return list;
  }, [commands, results, query, router, onOpenChange]);

  // Raccourci global ⌘K / Ctrl+K
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

  // Réinitialise la saisie à l'ouverture, et la sélection quand la requête
  // change — ajustement pendant le rendu (cf. « you might not need an effect »).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActive(0);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActive(0);
    setResults(null);
  }

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
      entries[active]?.run();
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }

  let lastGroup: Entry["group"] | null = null;

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-[100] flex items-start justify-center bg-foreground/20 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="animate-scale-in w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
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
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>
        <ul className="max-h-96 overflow-y-auto p-1.5">
          {entries.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {searching ? "Recherche…" : "Aucun résultat"}
            </li>
          )}
          {entries.map((c, i) => {
            const Icon = c.icon;
            const showHeader = c.group !== lastGroup && query.trim().length >= 2;
            lastGroup = c.group;
            return (
              <li key={c.id}>
                {showHeader && (
                  <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {GROUP_LABELS[c.group]}
                  </p>
                )}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={c.run}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    i === active ? "bg-accent" : "hover:bg-accent/60"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.label}</span>
                    {c.sub && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.sub}
                      </span>
                    )}
                  </span>
                  {c.hint && (
                    <span className="text-xs text-muted-foreground">{c.hint}</span>
                  )}
                  {i === active && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
