import type { Metadata } from "next";
import { FileText, FolderOpen, ShieldCheck, Link2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PortalDocumentList } from "@/components/portal/portal-document-list";
import { getPortalData } from "@/lib/share-links";
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

  const { organization, workspace, documents } = portal;
  const accent = organization.primary_color ?? "var(--color-primary)";

  return (
    <div className="min-h-screen bg-muted/40">
      {/* En-tête de marque */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5 sm:px-6">
          {organization.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.logo_url}
              alt={organization.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {getInitials(organization.name)}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">{organization.name}</p>
            <p className="text-xs text-muted-foreground">Espace documentaire</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        {/* Accueil */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {organization.name} partage avec vous les documents ci-dessous.
            {workspace.client_company ? ` Espace dédié à ${workspace.client_company}.` : ""}
          </p>
        </div>

        {/* Documents */}
        {documents.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Aucun document partagé"
            description="Les documents partagés par votre contact apparaîtront ici."
          />
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Documents ({documents.length})
            </h2>
            <PortalDocumentList token={token} documents={documents} />
          </section>
        )}

        {/* Réassurance + signature */}
        <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Accès sécurisé — aucun compte requis
        </div>
        <div className="flex items-center justify-center gap-1.5 border-t border-border pt-6 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Propulsé par Docalio
        </div>
      </main>
    </div>
  );
}
