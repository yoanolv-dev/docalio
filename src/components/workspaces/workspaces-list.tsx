"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Eye, FileText, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WorkspaceStatusBadge } from "@/components/workspaces/workspace-status-badge";
import { formatRelativeTime } from "@/lib/utils";
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Rechercher un espace, une société..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="sm:w-44"
        >
          <option value="all">Tous les statuts</option>
          <option value="prospect">Prospect</option>
          <option value="active">Actif</option>
          <option value="archived">Archivé</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Aucun espace ne correspond à votre recherche.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {filtered.length} espace{filtered.length > 1 ? "s" : ""}
            {filtered.length !== workspaces.length
              ? ` sur ${workspaces.length}`
              : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => (
              <Link
                key={w.id}
                href={`/dashboard/workspaces/${w.id}`}
                className="group"
              >
                <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-ring/60 group-hover:shadow-md">
                  <CardContent className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor:
                            w.primary_color ?? "var(--color-primary)",
                        }}
                      >
                        <Building2 className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <WorkspaceStatusBadge status={w.status} />
                    </div>

                    <p className="mt-3 truncate text-sm font-semibold">
                      {w.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {w.client_company ?? w.client_email ?? "Espace client"}
                    </p>

                    {/* Signaux réels : documents, portail, attente client */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {w.documentCount} doc{w.documentCount > 1 ? "s" : ""}
                      </span>
                      {w.visibleCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {w.visibleCount} visible
                          {w.visibleCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {w.hasActiveLink && (
                        <span
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                          title="Lien de portail actif"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Portail
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5">
                      <p className="truncate text-xs text-muted-foreground/80">
                        {w.lastActivityAt
                          ? `Activité ${formatRelativeTime(w.lastActivityAt).toLowerCase()}`
                          : "Aucune activité client"}
                      </p>
                      {w.pendingDecisions > 0 && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                          {w.pendingDecisions} en attente
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
