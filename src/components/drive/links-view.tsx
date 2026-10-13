"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, Download, Eye, Inbox, KeyRound, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ItemIcon } from "@/components/drive/item-icon";
import { revokeLinkAction } from "@/lib/actions/links";
import type { OrgLink } from "@/lib/links";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

function permissionLabel(l: OrgLink) {
  if (!l.can_view) return { label: "Dépôt", icon: Inbox };
  if (l.can_upload) return { label: "Téléchargement et dépôt", icon: Link2 };
  return l.can_download ? { label: "Téléchargement", icon: Download } : { label: "Consultation", icon: Eye };
}

/** Tous les liens actifs : qui voit quoi, combien de fois, jusqu'à quand. */
export function LinksView({ links }: { links: OrgLink[] }) {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
        <Link2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-semibold">Aucun lien de partage actif</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Depuis un espace, choisissez « Partager » sur un fichier ou un dossier pour créer un lien sécurisé.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
      {links.map((l) => {
        const perm = permissionLabel(l);
        const PermIcon = perm.icon;
        const href =
          l.target_kind === "folder"
            ? `/dashboard/workspaces/${l.workspace_id}?dossier=${l.folder_id}`
            : `/dashboard/workspaces/${l.workspace_id}`;
        return (
          <li key={l.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap", !l.live && "opacity-60")}>
            <ItemIcon kind={l.target_kind === "file" ? "file" : "folder"} name={l.target_name} mime={l.target_mime} />
            <div className="min-w-0 flex-1">
              <Link href={href} className="block truncate text-sm font-medium hover:text-primary hover:underline">
                {l.label ? `${l.label} · ` : ""}
                {l.target_name}
              </Link>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <PermIcon className="h-3 w-3" />
                  {perm.label}
                </span>
                {l.has_password && (
                  <span className="inline-flex items-center gap-1">
                    <KeyRound className="h-3 w-3" />
                    Mot de passe
                  </span>
                )}
                <span>{l.expires_at ? (l.live ? `Expire le ${formatDate(l.expires_at)}` : "Expiré") : "Sans expiration"}</span>
                <span>{l.workspace_name}</span>
              </p>
            </div>
            <div className="hidden w-44 shrink-0 text-xs text-muted-foreground lg:block">
              <p>
                {l.view_count} ouverture{l.view_count > 1 ? "s" : ""}
                {l.can_download ? ` · ${l.download_count} téléch.` : ""}
                {l.can_upload ? ` · ${l.upload_count} dépôt${l.upload_count > 1 ? "s" : ""}` : ""}
              </p>
              <p className="truncate">
                Créé {formatRelativeTime(l.created_at).replace(/^I/, "i")}
                {l.created_by_name ? ` par ${l.created_by_name}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/s/${l.token}`);
                    setCopied(l.id);
                    window.setTimeout(() => setCopied(null), 1800);
                  } catch {
                    toast.error("Copie impossible.");
                  }
                }}
              >
                {copied === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === l.id ? "Copié" : "Copier"}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Révoquer"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await revokeLinkAction(l.id);
                    if (r.ok) toast.show("Lien révoqué.");
                    else toast.error(r.message);
                  })
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
