"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn, getInitials } from "@/lib/utils";
import {
  inviteMemberAction,
  removeMemberAction,
  revokeInviteAction,
  setMemberRoleAction,
} from "@/lib/actions/team";
import type { OrgMember, PendingInvite } from "@/lib/team";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Admin",
  member: "Membre",
};

function inviteUrl(token: string): string {
  if (typeof window === "undefined") return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

export function TeamManager({
  members,
  invites,
  currentUserId,
  canManage,
}: {
  members: OrgMember[];
  invites: PendingInvite[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Formulaire d'invitation
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  }

  function createInvite() {
    setError(null);
    setGeneratedLink(null);
    startTransition(async () => {
      const r = await inviteMemberAction(inviteRole, inviteEmail);
      if (r.ok && r.token) {
        const url = inviteUrl(r.token);
        setGeneratedLink(url);
        copy(url, "new");
        setInviteEmail("");
      } else {
        setError(r.message ?? "Création de l'invitation impossible.");
      }
    });
  }

  function changeRole(memberId: string, role: "owner" | "admin" | "member") {
    setError(null);
    startTransition(async () => {
      const r = await setMemberRoleAction(memberId, role);
      if (!r.ok) setError(r.message ?? "Modification impossible.");
    });
  }

  function removeMember(memberId: string, name: string) {
    if (!window.confirm(`Retirer ${name} de l'organisation ?`)) return;
    setError(null);
    startTransition(async () => {
      const r = await removeMemberAction(memberId);
      if (!r.ok) setError(r.message ?? "Suppression impossible.");
    });
  }

  function revokeInvite(inviteId: string) {
    setError(null);
    startTransition(async () => {
      const r = await revokeInviteAction(inviteId);
      if (!r.ok) setError(r.message ?? "Révocation impossible.");
    });
  }

  return (
    <div className="space-y-5">
      {/* Inviter */}
      {canManage && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4 text-primary" />
            Inviter un collègue
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Générez un lien d&apos;invitation à partager. Valable 14 jours.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="Email (optionnel)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
              aria-label="Rôle de l'invité"
              className="sm:w-36"
            >
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
            </Select>
            <Button onClick={createInvite} disabled={pending}>
              <Link2 className="h-4 w-4" />
              Créer le lien
            </Button>
          </div>

          {generatedLink && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {generatedLink}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(generatedLink, "new")}
              >
                {copied === "new" ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Membres */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Membres · {members.length}
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {members.map((m) => {
            const name = m.full_name || m.email || "Membre";
            const isSelf = m.user_id === currentUserId;
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-subtle text-xs font-semibold text-primary">
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getInitials(name)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {name}
                    {isSelf && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (vous)
                      </span>
                    )}
                  </p>
                  {m.email && (
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  )}
                </div>

                {canManage && !isSelf ? (
                  <>
                    <Select
                      value={m.role}
                      onChange={(e) =>
                        changeRole(m.id, e.target.value as "owner" | "admin" | "member")
                      }
                      aria-label={`Rôle de ${name}`}
                      className="h-8 w-32 text-xs"
                      disabled={pending}
                    >
                      <option value="owner">Propriétaire</option>
                      <option value="admin">Admin</option>
                      <option value="member">Membre</option>
                    </Select>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id, name)}
                      disabled={pending}
                      aria-label={`Retirer ${name}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      m.role === "owner"
                        ? "bg-primary-subtle text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {ROLE_LABEL[m.role]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Invitations en attente */}
      {canManage && invites.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Invitations en attente · {invites.length}
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Link2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {inv.email || "Lien d'invitation"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[inv.role]} · en attente
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copy(inviteUrl(inv.token), inv.id)}
                >
                  {copied === inv.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Lien
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => revokeInvite(inv.id)}
                  disabled={pending}
                  aria-label="Révoquer l'invitation"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
