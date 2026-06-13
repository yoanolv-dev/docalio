"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LoaderCircle,
  Lock,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  grantWorkspaceAccessAction,
  revokeWorkspaceAccessAction,
} from "@/lib/actions/access";
import type { WorkspaceAccessEntry } from "@/lib/access";
import type { GroupWithMembers } from "@/lib/access";
import type { OrgMember } from "@/lib/team";

function nameOf(m: { full_name: string | null; email: string | null }): string {
  return m.full_name ?? m.email ?? "Membre";
}

/**
 * Gestion des accès d'un espace interne : l'admin choisit, en direct, quels
 * groupes / utilisateurs y ont accès. Les propriétaires & admins y accèdent
 * toujours (implicite, géré par la RLS).
 */
export function SpaceAccessPanel({
  workspaceId,
  access,
  groups,
  members,
  canManage,
}: {
  workspaceId: string;
  access: WorkspaceAccessEntry[];
  groups: GroupWithMembers[];
  members: OrgMember[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.message ?? "Action impossible.");
      else router.refresh();
    });
  }

  const grantedGroupIds = new Set(
    access.filter((a) => a.group).map((a) => a.group!.id)
  );
  const grantedUserIds = new Set(
    access.filter((a) => a.user).map((a) => a.user!.id)
  );
  const availableGroups = groups.filter((g) => !grantedGroupIds.has(g.id));
  const availableMembers = members.filter((m) => !grantedUserIds.has(m.user_id));

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Les propriétaires et administrateurs y ont toujours accès. Ajoutez
          ci-dessous les groupes ou personnes autorisés.
        </p>
      </div>

      {access.length > 0 && (
        <ul className="space-y-1.5">
          {access.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                {a.group ? (
                  <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">
                  {a.group ? a.group.name : a.user ? nameOf(a.user) : "—"}
                </span>
              </span>
              {canManage && (
                <button
                  type="button"
                  aria-label="Révoquer l'accès"
                  disabled={pending}
                  onClick={() =>
                    run(() => revokeWorkspaceAccessAction(a.id, workspaceId))
                  }
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!canManage ? (
        access.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Accès géré par un administrateur.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {availableGroups.length > 0 && (
            <Select
              aria-label="Autoriser un groupe"
              defaultValue=""
              disabled={pending}
              onChange={(e) => {
                const id = e.target.value;
                e.currentTarget.value = "";
                if (id)
                  run(() =>
                    grantWorkspaceAccessAction(workspaceId, "group", id)
                  );
              }}
              className="h-8 text-sm"
            >
              <option value="" disabled>
                + Autoriser un groupe…
              </option>
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          )}

          {availableMembers.length > 0 && (
            <Select
              aria-label="Autoriser une personne"
              defaultValue=""
              disabled={pending}
              onChange={(e) => {
                const id = e.target.value;
                e.currentTarget.value = "";
                if (id)
                  run(() =>
                    grantWorkspaceAccessAction(workspaceId, "user", id)
                  );
              }}
              className="h-8 text-sm"
            >
              <option value="" disabled>
                + Autoriser une personne…
              </option>
              {availableMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {nameOf(m)}
                </option>
              ))}
            </Select>
          )}

          {pending && (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Mise à jour…
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
