import Link from "next/link";
import type { Metadata } from "next";
import {
  Briefcase,
  ScrollText,
  Building2,
  ClipboardCheck,
  FileSignature,
  FolderKanban,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PageHero } from "@/components/marketing/page-hero";
import { ComparisonTable } from "@/components/marketing/comparison-table";

export const metadata: Metadata = {
  title: "Cas d’usage",
  description:
    "Agences, consultants, cabinets, commerciaux B2B et PME : découvrez comment Docalio aide à envoyer, suivre et faire valider les documents clients.",
  alternates: { canonical: "/cas-usage" },
};

const PROFILES = [
  {
    icon: Briefcase,
    title: "Agences web, SEO & marketing",
    description:
      "Présentez propositions, livrables et reportings dans un espace soigné qui valorise votre travail.",
    points: [
      "Propositions commerciales suivies à la trace",
      "Validation des livrables sans email perdu",
      "Portail à vos couleurs, image premium",
    ],
  },
  {
    icon: ScrollText,
    title: "Consultants & cabinets",
    description:
      "Partagez rapports et dossiers confidentiels avec un contrôle d’accès et une traçabilité de bout en bout.",
    points: [
      "Documents sensibles en stockage privé",
      "Téléchargement contrôlé document par document",
      "Historique d’activité par dossier",
    ],
  },
  {
    icon: Building2,
    title: "Commerciaux B2B & PME",
    description:
      "Transformez vos devis et contrats en parcours clair, et sachez quand relancer au bon moment.",
    points: [
      "Suivi des ouvertures et téléchargements",
      "Décision client recueillie dans le portail",
      "Relances prêtes à copier, contextualisées",
    ],
  },
];

const DOC_TYPES = [
  { icon: FileSignature, label: "Propositions commerciales" },
  { icon: ClipboardCheck, label: "Contrats & devis" },
  { icon: FolderKanban, label: "Dossiers clients" },
  { icon: ScrollText, label: "Rapports & audits" },
];

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        eyebrow="Cas d’usage"
        title="Pour tous ceux qui partagent des documents qui comptent"
        description="Docalio s’adapte à votre métier : envoyez, suivez et faites valider vos documents clients, sans friction."
      >
        <Button size="lg" asChild>
          <Link href="/register">
            Démarrer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHero>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {PROFILES.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="flex flex-col rounded-2xl border border-border bg-card p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      <Section muted>
        <SectionHeading
          eyebrow="Documents"
          title="Pensé pour vos documents les plus importants"
          description="Chaque type de document devient un dossier suivi, sécurisé et actionnable."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOC_TYPES.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <span className="text-sm font-medium">{d.label}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Comparatif */}
      <Section id="comparatif">
        <SectionHeading
          eyebrow="Comparatif"
          title="Là où s’arrêtent l’email, le Drive et WeTransfer"
          description="Les outils génériques transfèrent des fichiers. Docalio gère l’expérience client, le suivi et la décision."
        />
        <div className="mt-10">
          <ComparisonTable />
        </div>
      </Section>

      <Section muted>
        <div className="overflow-hidden rounded-2xl bg-primary px-8 py-14 text-center">
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">
            Un espace client privé pour chaque dossier important
          </h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
            Essayez Docalio sur votre prochain dossier client.
          </p>
          <Button size="lg" variant="secondary" className="mt-7" asChild>
            <Link href="/register">Démarrer gratuitement</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
