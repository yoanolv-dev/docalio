"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock, Search } from "lucide-react";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import type { WorkspaceListItem } from "@/lib/workspaces";

type Scope = "active" | "archived";

/** L'unique signal à retenir pour un espace (le plus actionnable). */
function signal(w: WorkspaceListItem): { label: string; tone: string } | null {
  if (w.status === "archived") return { label: "Archivé", tone: "text-muted-foreground" };
  if (w.requests.toReview > 0)
    return { label: `${w.requests.toReview} à vérifier`, tone: "text-violet-700 font-medium" };
  if (w.requests.waiting > 0)
    return { label: `${w.requests.waiting} attendue${w.requests.waiting > 1 ? "s" : ""}`, tone: "text-muted-foreground" };
  if (w.requests.total > 0) return { label: "Complet", tone: "text-emerald-700 font-medium" };
  return null;
}

export function SpacesList({
  workspaces,
  singular,
}: {
  workspaces: WorkspaceListItem[];
  singular: string;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("active");
  const archivedCount = workspaces.filter((w) => w.status === "archived").length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces
      .filter((w) => (scope === "archived" ? w.status === "archived" : w.status !== "archived"))
      .filter(
        (w) =>
          !q ||
          w.name.toLowerCase().includes(q) ||
          (w.client_company ?? "").toLowerCase().includes(q) ||
          (w.client_email ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => (b.lastActivityAt ?? b.updated_at).localeCompare(a.lastActivityAt ?? a.updated_at));
  }, [workspaces, query, scope]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Rechercher un ${singular}…`}
            aria-label={`Rechercher un ${singular}`}
            className="h-9 w-full rounded-lg bg-canvas/70 pl-8 pr-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:bg-white focus:ring-2"
          />
        </div>
        {archivedCount > 0 && (
          <div className="flex rounded-lg bg-canvas p-0.5 text-sm">
            {(["active", "archived"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                aria-pressed={scope === s}
                className={cn(
                  "rounded-md px-3 py-1 font-medium transition-colors",
                  scope === s ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "active" ? "En cours" : `Archivés (${archivedCount})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          {query ? "Aucun résultat pour cette recherche." : "Rien ici pour l'instant."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((w) => {
            const sig = signal(w);
            const pct = w.requests.total ? Math.round((w.requests.validated / w.requests.total) * 100) : 0;
            const color = w.primary_color ?? "var(--color-primary)";
            return (
              <li key={w.id}>
                <Link
                  href={`/dashboard/workspaces/${w.id}`}
                  className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-canvas/60 sm:px-5"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {w.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : w.space_type === "internal" ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      getInitials(w.client_company ?? w.name)
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{w.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {w.client_email ?? (w.space_type === "internal" ? "Espace interne" : w.client_company ?? "—")}
                    </span>
                  </span>

                  {w.requests.total > 0 && (
                    <span className="hidden w-32 shrink-0 md:block" title={`${w.requests.validated} sur ${w.requests.total} pièces validées`}>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary")}
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                        {w.requests.validated}/{w.requests.total} pièces
                      </span>
                    </span>
                  )}

                  <span className="hidden w-28 shrink-0 text-right sm:block">
                    {sig && <span className={cn("block text-sm", sig.tone)}>{sig.label}</span>}
                    <span className="block text-xs text-muted-foreground">
                      {w.lastActivityAt ? formatRelativeTime(w.lastActivityAt) : "Pas d'activité"}
                    </span>
                  </span>

                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
