"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WorkspaceStatusBadge } from "@/components/workspaces/workspace-status-badge";
import type { Workspace, WorkspaceStatus } from "@/lib/types/database";

type StatusFilter = WorkspaceStatus | "all";

export function WorkspacesList({ workspaces }: { workspaces: Workspace[] }) {
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
        <p className="rounded-lg border border-dashed border-[--color-border] px-4 py-10 text-center text-sm text-[--color-muted-foreground]">
          Aucun espace ne correspond à votre recherche.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => (
            <Link key={w.id} href={`/dashboard/workspaces/${w.id}`}>
              <Card className="h-full transition-colors hover:border-[--color-ring]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor:
                          w.primary_color ?? "var(--color-primary)",
                      }}
                    >
                      <Building2 className="h-4 w-4 text-[--color-primary-foreground]" />
                    </div>
                    <WorkspaceStatusBadge status={w.status} />
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold">{w.name}</p>
                  <p className="truncate text-xs text-[--color-muted-foreground]">
                    {w.client_company ?? "—"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
