"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Trash2, UserPlus, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  addGroupMemberAction,
  createGroupAction,
  deleteGroupAction,
  removeGroupMemberAction,
} from "@/lib/actions/access";
import type { GroupWithMembers } from "@/lib/access";
import type { OrgMember } from "@/lib/team";

function nameOf(m: { full_name: string | null; email: string | null }): string {
  return m.full_name ?? m.email ?? "Membre";
}

export function GroupsManager({
  groups,
  members,
  canManage,
}: {
  groups: GroupWithMembers[];
  members: OrgMember[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
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

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        Seuls les administrateurs peuvent gérer les groupes d&apos;accès.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Réunissez vos utilisateurs en groupes (ex. «&nbsp;Commerciaux&nbsp;»,
        «&nbsp;Direction&nbsp;»), puis donnez à chaque groupe l&apos;accès aux
        espaces internes voulus depuis chaque espace.
      </p>

      {/* Créer un groupe */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          run(async () => {
            const r = await createGroupAction(newName);
            if (r.ok) setNewName("");
            return r;
          });
        }}
        className="flex gap-2"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom du groupe (ex. Commerciaux)"
          aria-label="Nom du groupe"
        />
        <Button type="submit" disabled={pending || !newName.trim()}>
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Créer
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun groupe pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const inGroup = new Set(g.members.map((m) => m.user_id));
            const available = members.filter((m) => !inGroup.has(m.user_id));
            return (
              <li
                key={g.id}
                className="rounded-xl border border-border bg-card p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-primary" />
                    {g.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() => run(() => deleteGroupAction(g.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {g.members.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      Aucun membre.
                    </span>
                  )}
                  {g.members.map((m) => (
                    <span
                      key={m.user_id}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs"
                    >
                      {nameOf(m)}
                      <button
                        type="button"
                        aria-label={`Retirer ${nameOf(m)}`}
                        disabled={pending}
                        onClick={() =>
                          run(() => removeGroupMemberAction(g.id, m.user_id))
                        }
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {available.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <Select
                      aria-label="Ajouter un membre au groupe"
                      defaultValue=""
                      disabled={pending}
                      onChange={(e) => {
                        const userId = e.target.value;
                        e.currentTarget.value = "";
                        if (userId)
                          run(() => addGroupMemberAction(g.id, userId));
                      }}
                      className="h-8 max-w-xs text-sm"
                    >
                      <option value="" disabled>
                        Ajouter un membre…
                      </option>
                      {available.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {nameOf(m)}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
