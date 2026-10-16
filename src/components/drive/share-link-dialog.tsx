"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Check,
  Copy,
  Download,
  Eye,
  KeyRound,
  Link2,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  createDriveLinkAction,
  listItemLinksAction,
  revokeDriveLinkAction,
} from "@/lib/actions/drive";
import { cn, formatDate } from "@/lib/utils";
import type { DriveLink } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// « Obtenir un lien » : partage d'un fichier, d'un dossier ou de l'espace
// entier par lien sécurisé — permissions, expiration, mot de passe, dépôt.
// ---------------------------------------------------------------------------

export interface ShareTarget {
  kind: "document" | "folder" | "space";
  id?: string;
  name: string;
}

const EXPIRY_OPTIONS = [
  { value: "never", label: "Sans expiration" },
  { value: "7", label: "Expire dans 7 jours" },
  { value: "30", label: "Expire dans 30 jours" },
  { value: "90", label: "Expire dans 90 jours" },
] as const;

function linkUrl(token: string): string {
  return `${window.location.origin}/l/${token}`;
}

export function ShareLinkDialog({
  workspaceId,
  target,
  onOpenChange,
}: {
  workspaceId: string;
  target: ShareTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const [links, setLinks] = useState<DriveLink[] | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options de création
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowUpload, setAllowUpload] = useState(false);
  const [expiry, setExpiry] = useState<string>("never");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listItemLinksAction({
      workspaceId,
      folderId: target.kind === "folder" ? target.id : null,
      documentId: target.kind === "document" ? target.id : null,
    }).then((rows) => {
      if (!cancelled) setLinks(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, target.kind, target.id]);

  function create() {
    setError(null);
    startTransition(async () => {
      const expiresAt =
        expiry === "never"
          ? null
          : new Date(Date.now() + Number(expiry) * 86400000).toISOString();
      const r = await createDriveLinkAction({
        workspaceId,
        folderId: target.kind === "folder" ? target.id : null,
        documentId: target.kind === "document" ? target.id : null,
        canView: true,
        canDownload: allowDownload,
        canUpload: target.kind !== "document" ? allowUpload : false,
        expiresAt,
        password: password || null,
        label: label || null,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setCreatedToken(r.token);
      setPassword("");
      setLabel("");
      const rows = await listItemLinksAction({
        workspaceId,
        folderId: target.kind === "folder" ? target.id : null,
        documentId: target.kind === "document" ? target.id : null,
      });
      setLinks(rows);
      void copy(linkUrl(r.token), r.token);
    });
  }

  async function copy(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      window.setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000);
    } catch {
      // Le champ reste sélectionnable manuellement.
    }
  }

  function revoke(linkId: string) {
    startTransition(async () => {
      const r = await revokeDriveLinkAction(workspaceId, linkId);
      if (!r.ok) {
        setError(r.message ?? "Révocation impossible.");
        return;
      }
      setLinks((ls) => (ls ?? []).filter((l) => l.id !== linkId));
    });
  }

  const kindLabel =
    target.kind === "document"
      ? "ce fichier"
      : target.kind === "folder"
        ? "ce dossier"
        : "tout l'espace";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Partager « {target.name} »
          </DialogTitle>
          <DialogDescription>
            Toute personne disposant du lien accède à {kindLabel}, sans compte.
            Vous pouvez le révoquer à tout moment.
          </DialogDescription>
        </DialogHeader>

        {/* Création */}
        <div className="space-y-3 rounded-xl border border-border bg-canvas/40 p-3.5">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Téléchargement autorisé
            </label>
            {target.kind !== "document" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowUpload}
                  onChange={(e) => setAllowUpload(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Autoriser le dépôt de fichiers
              </label>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe (optionnel)"
              autoComplete="new-password"
            />
          </div>
          <div className="flex gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Note interne, ex. « Envoyé à Marie » (optionnel)"
              maxLength={120}
              className="flex-1"
            />
            <Button onClick={create} disabled={busy}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Créer le lien
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {createdToken && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-subtle px-3 py-2">
              <input
                readOnly
                value={linkUrl(createdToken)}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none"
              />
              <button
                type="button"
                onClick={() => copy(linkUrl(createdToken), createdToken)}
                className="shrink-0 rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10"
                title="Copier le lien"
              >
                {copied === createdToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Liens existants */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Liens actifs
          </p>
          {links === null ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              <LoaderCircle className="mx-auto h-4 w-4 animate-spin" />
            </p>
          ) : links.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Aucun lien pour cet élément.
            </p>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto">
              {links.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {l.label ?? `Lien du ${formatDate(l.created_at)}`}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1" title="Ouvertures">
                        <Eye className="h-3 w-3" />
                        {l.view_count}
                      </span>
                      {l.can_download && (
                        <span className="inline-flex items-center gap-1" title="Téléchargements">
                          <Download className="h-3 w-3" />
                          {l.download_count}
                        </span>
                      )}
                      {l.can_upload && (
                        <span className="inline-flex items-center gap-1" title="Dépôts reçus">
                          <Upload className="h-3 w-3" />
                          {l.upload_count}
                        </span>
                      )}
                      {l.has_password && (
                        <span className="inline-flex items-center gap-1" title="Protégé par mot de passe">
                          <KeyRound className="h-3 w-3" />
                        </span>
                      )}
                      {l.expires_at && <span>exp. {formatDate(l.expires_at)}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(linkUrl(l.token), l.token)}
                    title="Copier le lien"
                    className={cn(
                      "shrink-0 rounded-md p-1.5 transition-colors",
                      copied === l.token
                        ? "text-emerald-600"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {copied === l.token ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => revoke(l.id)}
                    title="Révoquer ce lien"
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
