import type { Metadata } from "next";
import {
  FileText,
  Link2,
  LockKeyhole,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { PortalDocuments } from "@/components/portal/portal-documents";
import { PortalTracker } from "@/components/portal/portal-tracker";
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

const REASSURANCE = [
  {
    icon: UserCheck,
    title: "Sans compte",
    text: "Aucune inscription, aucun mot de passe à retenir.",
  },
  {
    icon: LockKeyhole,
    title: "Accès privé",
    text: "Ce lien vous est destiné — les fichiers ne sont pas publics.",
  },
  {
    icon: ShieldCheck,
    title: "Transferts sécurisés",
    text: "Chaque consultation passe par un lien chiffré temporaire.",
  },
];

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const portal = await getPortalData(token);

  if (!portal) return <PortalInvalid />;

  const decisions = await getPortalDecisions(token);
  const { organization, workspace, documents } = portal;
  const accent = organization.primary_color ?? "#4f46e5";

  return (
    <div className="min-h-screen bg-muted/30">
      <PortalTracker token={token} />

      {/* Filet de marque */}
      <div aria-hidden className="h-1" style={{ backgroundColor: accent }} />

      {/* En-tête de marque */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={organization.logo_url}
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
            . Consultez vos documents, téléchargez-les et indiquez votre
            décision en quelques clics.
          </p>
        </div>

        {/* Documents + progression */}
        <PortalDocuments
          token={token}
          documents={documents}
          initialDecisions={decisions}
          accent={accent}
        />

        {/* Réassurance */}
        <div className="grid gap-3 sm:grid-cols-3">
          {REASSURANCE.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-card p-4"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="mt-2 text-xs font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Signature */}
        <div className="flex items-center justify-center gap-1.5 border-t border-border pt-6 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Propulsé par Docalio — l&apos;espace documentaire client
        </div>
      </main>
    </div>
  );
}
