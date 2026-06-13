import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  FileText,
  FolderClosed,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { PortalAccessForm } from "@/components/portal/portal-access-form";
import { getPortalLanding } from "@/lib/share-links";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Espace documentaire",
  robots: { index: false, follow: false },
};

const POINTS = [
  {
    icon: UserCheck,
    title: "Sans compte",
    text: "Aucune inscription : votre lien sécurisé suffit.",
  },
  {
    icon: LockKeyhole,
    title: "Accès privé",
    text: "Vos documents ne sont jamais publics.",
  },
  {
    icon: ShieldCheck,
    title: "Transferts chiffrés",
    text: "Chaque consultation passe par un lien temporaire.",
  },
];

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const landing = await getPortalLanding(slug);
  if (!landing) notFound();

  const { organization, workspace, has_active_link, document_count } = landing;
  const accent =
    workspace.primary_color ?? organization.primary_color ?? "#2563eb";
  const logoUrl = workspace.logo_url ?? organization.logo_url;

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col bg-muted/30"
      style={{ ["--brand" as string]: accent }}
    >
      {/* Halo de marque (en arrière-plan) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
        style={{
          background: `radial-gradient(60% 100% at 50% 0%, color-mix(in oklab, ${accent} 18%, transparent), transparent 75%)`,
        }}
      />
      <div aria-hidden className="h-1.5" style={{ backgroundColor: accent }} />

      <main className="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <div className="animate-fade-up rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-9">
          {/* Identité */}
          <div className="flex items-center gap-3.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={organization.name}
                className="h-14 w-14 rounded-2xl object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-sm"
                style={{ backgroundColor: accent }}
              >
                {getInitials(organization.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {organization.name}
              </p>
              <p
                className="inline-flex items-center gap-1.5 text-xs font-medium"
                style={{ color: accent }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Espace documentaire privé
              </p>
            </div>
          </div>

          {/* Accroche */}
          <h1 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
            Bienvenue
            {workspace.client_company ? `, ${workspace.client_company}` : ""}.
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {organization.name} a préparé votre espace «&nbsp;{workspace.name}
            &nbsp;».{" "}
            {has_active_link
              ? "Saisissez le lien d'accès qui vous a été communiqué pour consulter vos documents, les télécharger et indiquer vos décisions."
              : "Votre espace est en cours de préparation. Vous recevrez prochainement un lien d'accès sécurisé."}
          </p>

          {has_active_link && (
            <>
              <div className="mt-6">
                <PortalAccessForm accent={accent} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FolderClosed className="h-3.5 w-3.5" />
                {document_count} document{document_count > 1 ? "s" : ""} vous
                {document_count > 1 ? " attendent" : " attend"} dans cet espace.
              </p>
            </>
          )}

          {/* Réassurance */}
          <div className="mt-7 grid gap-2.5 border-t border-border pt-6 sm:grid-cols-3">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title}>
                  <Icon className="h-4 w-4" style={{ color: accent }} />
                  <p className="mt-1.5 text-xs font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {p.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Propulsé par Docalio — l&apos;espace documentaire client
        </p>
      </main>
    </div>
  );
}
