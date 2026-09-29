"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Link2, LoaderCircle, Mail, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createShareLinkAction } from "@/lib/actions/share-links";

/**
 * Le lien client, cœur de l'espace : copier, envoyer par e-mail, prévisualiser.
 * Sans lien actif, un seul bouton suffit à en créer un (sans expiration).
 */
export function LinkCard({
  workspaceId,
  url,
  clientEmail,
  clientName,
  orgName,
  justCreated = false,
  progress,
}: {
  workspaceId: string;
  url: string | null;
  clientEmail: string | null;
  clientName: string | null;
  orgName: string | null;
  justCreated?: boolean;
  progress: string[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function activate() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("workspace_id", workspaceId);
      fd.set("expiry", "never");
      const r = await createShareLinkAction(null, fd);
      if (r && !r.ok) setError(r.message ?? "Activation impossible.");
      router.refresh();
    });
  }

  if (!url) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-white p-5 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted-foreground">
          <Link2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Le lien client est désactivé</p>
          <p className="text-sm text-muted-foreground">Activez-le pour que votre client accède à son espace.</p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <Button onClick={activate} disabled={pending} className="shrink-0">
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Activer le lien
        </Button>
      </div>
    );
  }

  const subject = `Votre espace documentaire${orgName ? ` : ${orgName}` : ""}`;
  const body = [
    `Bonjour${clientName ? ` ${clientName}` : ""},`,
    "",
    "Voici le lien de votre espace sécurisé : vous pourrez y déposer les pièces demandées et consulter vos documents, sans créer de compte.",
    "",
    url,
    "",
    "Bien cordialement,",
    orgName ?? "",
  ].join("\n");
  const mailto = `mailto:${clientEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {justCreated && (
        <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-5 py-2.5 text-sm text-emerald-800">
          <PartyPopper className="h-4 w-4" />
          Espace prêt. Il ne reste qu&apos;à envoyer ce lien à votre client.
        </div>
      )}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-canvas/70 px-3.5 py-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-medium" title={url}>
            {url.replace(/^https?:\/\//, "")}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={copy} className="flex-1 sm:flex-none">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <a href={mailto}>
              <Mail className="h-4 w-4" />
              Envoyer
            </a>
          </Button>
          <Button variant="outline" size="icon" asChild title="Voir comme le client">
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Voir comme le client">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
      {progress.length > 0 && (
        <p className="border-t border-border px-5 py-2.5 text-sm text-muted-foreground">
          {progress.map((p, i) => (
            <span key={p}>
              {i > 0 && <span className="mx-2 text-border">•</span>}
              {p}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
