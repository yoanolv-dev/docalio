"use client";

import { useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { removeMemberAction } from "@/lib/actions/team";
import type { OrgGuest } from "@/lib/team";

/** Invités extérieurs : qui, quels espaces, retrait de l'organisation. */
export function GuestsList({ guests, canManage }: { guests: OrgGuest[]; canManage: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();

  if (guests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Aucun invité pour l&apos;instant. Invitez un client ou un partenaire depuis le bouton « Partager » d&apos;un espace.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {guests.map((g) => (
        <li key={g.memberId} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-semibold text-violet-700">
            {g.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{g.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {g.spaces.length === 0
                ? "Aucun espace ouvert"
                : g.spaces.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ", "}
                      <Link href={`/dashboard/workspaces/${s.id}`} className="hover:underline">{s.name}</Link>
                      {s.level === "viewer" ? " (lecture)" : ""}
                    </span>
                  ))}
            </p>
          </div>
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await removeMemberAction(g.memberId);
                  if (r.ok) toast.show(`${g.name} n'a plus accès à vos espaces.`);
                  else toast.error(r.message ?? "Retrait impossible.");
                })
              }
            >
              {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
              Retirer
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
