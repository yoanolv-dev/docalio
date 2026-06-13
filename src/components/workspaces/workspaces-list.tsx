"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Link2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WorkspaceStatusBadge } from "@/components/workspaces/workspace-status-badge";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import type { WorkspaceListItem } from "@/lib/workspaces";
import type { WorkspaceStatus } from "@/lib/types/database";

type StatusFilter = WorkspaceStatus | "all";

export function WorkspacesList({
  workspaces,
}: {
  workspaces: WorkspaceListItem[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workspaces.filter((w) => {
      if (status !== "all" && w.status !== status) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        (w.client_company ?? "").toLowerCase().includes(q) ||
        (w.client_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [workspaces, query, status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="sm:w-40"
          aria-label="Filtrer par statut"
        >
          <option value="all">Tous</option>
          <option value="prospect">Prospects</option>
          <option value="active">Actifs</option>
          <option value="archived">Archivés</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          Aucun espace ne correspond à votre recherche.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => (
            <Link
              key={w.id}
              href={`/dashboard/workspaces/${w.id}`}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-[0_4px_24px_-12px_rgba(0,0,0,0.18)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                    {getInitials(w.client_company ?? w.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight" title={w.name}>
                      {w.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {w.client_company ?? w.client_email ?? "Espace client"}
                    </p>
                  </div>
                </div>
                <WorkspaceStatusBadge status={w.status} />
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {w.documentCount}
                </span>
                {w.hasActiveLink && (
                  <span
                    className="inline-flex items-center gap-1.5 text-foreground"
                    title="Portail partagé"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Partagé
                  </span>
                )}
                {w.pendingDecisions > 0 && (
                  <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 font-medium text-warning">
                    {w.pendingDecisions} en attente
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="truncate">
                  {w.lastActivityAt
                    ? formatRelativeTime(w.lastActivityAt)
                    : "Pas encore d'activité"}
                </span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  )}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
