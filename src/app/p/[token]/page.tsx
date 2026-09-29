import type { Metadata } from "next";
import {
  FileText,
  Link2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { PortalDocuments } from "@/components/portal/portal-documents";
import { PortalTracker } from "@/components/portal/portal-tracker";
import { PortalRequests } from "@/components/portal/portal-requests";
import { getPortalRequests } from "@/lib/requests";
import { getPortalData, getPortalDecisions } from "@/lib/share-links";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Espace documentaire",
  robots: { index: false, follow: false },
};

function PortalInvalid() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Link2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-5 text-lg font-semibold">Lien indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce lien de partage est invalide, a été désactivé ou a expiré.
          Rapprochez-vous de votre contact pour obtenir un nouvel accès.
        </p>
      </div>
    </main>
  );
}


export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const portal = await getPortalData(token);

  if (!portal) return <PortalInvalid />;

  const [decisions, requests] = await Promise.all([
    getPortalDecisions(token),
    getPortalRequests(token),
  ]);
  const { organization, workspace, documents, folders } = portal;
  // Branding par client : la couleur et le logo de l'espace priment sur ceux de
  // l'organisation, pour un portail vraiment personnalisé par client.
  const accent =
    workspace.primary_color ?? organization.primary_color ?? "#2563eb";
  const logoUrl = workspace.logo_url ?? organization.logo_url;

  return (
    <div
      className="relative min-h-screen bg-muted/30"
      style={{ ["--brand" as string]: accent }}
    >
      <PortalTracker token={token} />

      {/* Halo de marque (en arrière-plan) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64"
        style={{
          background: `radial-gradient(70% 100% at 50% 0%, color-mix(in oklab, ${accent} 14%, transparent), transparent 72%)`,
        }}
      />

      {/* Filet de marque */}
      <div aria-hidden className="h-1.5" style={{ backgroundColor: accent }} />

      {/* En-tête de marque */}
      <header className="relative border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={organization.name}
                className="h-10 w-10 rounded-lg object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                {getInitials(organization.name)}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">{organization.name}</p>
              <p className="text-xs text-muted-foreground">
                Espace documentaire
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Accès sécurisé
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        {/* Accueil */}
        <div className="space-y-2">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: accent }}
          >
            Votre espace privé
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {workspace.name}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {organization.name} a préparé cet espace
            {workspace.client_company
              ? ` pour ${workspace.client_company}`
              : " pour vous"}
            .{" "}
            {requests.length > 0
              ? "Déposez les pièces demandées, consultez vos documents et indiquez votre décision en quelques clics."
              : "Consultez vos documents, téléchargez-les et indiquez votre décision en quelques clics."}
          </p>
        </div>

        {/* Pièces à fournir (collecte) */}
        <PortalRequests token={token} requests={requests} accent={accent} />

        {/* Documents + progression */}
        {(documents.length > 0 || requests.length === 0) && (
        <PortalDocuments
          token={token}
          documents={documents}
          folders={folders}
          initialDecisions={decisions}
          accent={accent}
        />
        )}

        {/* Réassurance + signature, en une ligne */}
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border pt-6 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5" />
          Espace privé et sécurisé · aucun compte nécessaire
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            Propulsé par Docalio
          </span>
        </p>
      </main>
    </div>
  );
}
