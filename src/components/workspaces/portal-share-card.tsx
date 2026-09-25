"use client";

import { useActionState, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Link2,
  LoaderCircle,
  Mail,
  RefreshCw,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  clientEmail,
  clientName,
  orgName,
}: {
  workspaceId: string;
  link: ShareLink | null;
  baseUrl: string;
  slug?: string | null;
  /** Pré-remplit l'e-mail d'envoi du lien. */
  clientEmail?: string | null;
  clientName?: string | null;
  orgName?: string | null;
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

  const subject = `Votre espace documentaire${orgName ? ` — ${orgName}` : ""}`;
  const body = [
    `Bonjour${clientName ? ` ${clientName}` : ""},`,
    "",
    "Voici le lien de votre espace sécurisé. Vous pourrez y déposer les pièces demandées, consulter vos documents et nous faire part de vos validations — sans créer de compte :",
    "",
    url,
    "",
    "Bien cordialement,",
    orgName ?? "",
  ].join("\n");
  const mailto = `mailto:${clientEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="success" dot>
          Portail actif
        </Badge>
        <span className="text-xs text-muted-foreground">
          {link.expires_at ? `Expire le ${formatDate(link.expires_at)}` : "Sans date d'expiration"}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-canvas/60 p-1.5">
        <div className="flex items-center gap-2">
          <Link2 className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            readOnly
            value={url.replace(/^https?:\/\//, "")}
            aria-label="Lien du portail client"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 truncate bg-transparent py-1.5 text-sm text-foreground outline-none"
          />
          <Button type="button" size="sm" onClick={copy} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="outline" asChild>
          <a href={mailto}>
            <Mail className="h-4 w-4" />
            Envoyer par e-mail
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Voir comme le client
          </a>
        </Button>
      </div>

      <details className="group rounded-xl border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          Options avancées
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-border p-3.5">
          {homeUrl && (
            <div>
              <p className="text-sm font-medium">Page d&apos;accueil à vos couleurs</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Une adresse facile à retenir, où votre client saisit son lien d&apos;accès.
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-canvas/60 px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm">{homeUrl.replace(/^https?:\/\//, "")}</span>
                <Button type="button" variant="ghost" size="sm" onClick={copyHome} className="h-7 shrink-0">
                  {homeCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <form action={regenerateShareLinkAction}>
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <Button type="submit" variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
                Générer un nouveau lien
              </Button>
            </form>
            <form action={deactivateShareLinkAction}>
              <input type="hidden" name="workspace_id" value={workspaceId} />
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <Power className="h-4 w-4" />
                Désactiver le portail
              </Button>
            </form>
          </div>
          <p className="text-xs text-muted-foreground">
            Un nouveau lien rend l&apos;ancien inutilisable immédiatement.
          </p>
        </div>
      </details>
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

      <div className="flex items-start gap-3 rounded-xl bg-primary-subtle/60 p-3.5">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground/80">
          Activez le portail pour obtenir un lien unique et sécurisé. Votre
          client y dépose ses pièces et consulte vos documents, sans compte.
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
        idle="Activer le portail client"
        pendingLabel="Activation…"
        isPending={pending}
      />
    </form>
  );
}
