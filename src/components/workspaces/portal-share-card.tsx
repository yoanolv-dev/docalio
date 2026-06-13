"use client";

import { useActionState, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  LoaderCircle,
  RefreshCw,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createShareLinkAction,
  deactivateShareLinkAction,
  regenerateShareLinkAction,
  type ShareLinkState,
} from "@/lib/actions/share-links";
import { formatDate } from "@/lib/utils";
import { buildPortalUrl, buildPortalHomeUrl } from "@/lib/portal-url";
import type { ShareLink } from "@/lib/types/database";

function SubmitButton({
  idle,
  pendingLabel,
  isPending,
  ...rest
}: {
  idle: string;
  pendingLabel: string;
  isPending: boolean;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button type="submit" disabled={isPending} {...rest}>
      {isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {isPending ? pendingLabel : idle}
    </Button>
  );
}

export function PortalShareCard({
  workspaceId,
  link,
  baseUrl,
  slug,
}: {
  workspaceId: string;
  link: ShareLink | null;
  baseUrl: string;
  slug?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [homeCopied, setHomeCopied] = useState(false);

  const url = link ? buildPortalUrl(baseUrl, link.token, slug ?? null) : "";
  const homeUrl = buildPortalHomeUrl(baseUrl, slug ?? null);

  async function copyHome() {
    if (!homeUrl) return;
    await navigator.clipboard.writeText(homeUrl);
    setHomeCopied(true);
    setTimeout(() => setHomeCopied(false), 2000);
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!link) {
    return <CreateLinkForm workspaceId={workspaceId} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="success" dot>
          Lien actif
        </Badge>
        {link.expires_at ? (
          <span className="text-xs text-muted-foreground">
            Expire le {formatDate(link.expires_at)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Sans expiration</span>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          readOnly
          value={url || "…"}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label="Copier le lien"
          title="Copier le lien"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Partagez ce lien avec votre client : il accède aux documents visibles
        sans créer de compte.
      </p>

      {homeUrl && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <p className="text-xs font-medium">Page d&apos;accueil de marque</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Une page d&apos;accueil personnalisée où le client saisit son lien.
          </p>
          <div className="mt-2 flex gap-2">
            <Input
              readOnly
              value={homeUrl}
              className="font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyHome}
              aria-label="Copier l'adresse de la page d'accueil"
              title="Copier l'adresse de la page d'accueil"
            >
              {homeCopied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <form action={regenerateShareLinkAction}>
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            Régénérer
          </Button>
        </form>
        <form action={deactivateShareLinkAction}>
          <input type="hidden" name="workspace_id" value={workspaceId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            <Power className="h-4 w-4" />
            Désactiver
          </Button>
        </form>
      </div>
    </div>
  );
}

function CreateLinkForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState<ShareLinkState, FormData>(
    createShareLinkAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspace_id" value={workspaceId} />

      <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Générez un lien unique et sécurisé. Votre client consultera les
          documents marqués « visibles » sans avoir à créer de compte.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expiry">Expiration</Label>
        <Select id="expiry" name="expiry" defaultValue="never">
          <option value="never">Jamais</option>
          <option value="7">Dans 7 jours</option>
          <option value="30">Dans 30 jours</option>
          <option value="90">Dans 90 jours</option>
        </Select>
      </div>

      {state && !state.ok && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {state.message}
        </p>
      )}

      <SubmitButton
        idle="Générer le lien du portail"
        pendingLabel="Génération..."
        isPending={pending}
        size="sm"
      />
    </form>
  );
}
