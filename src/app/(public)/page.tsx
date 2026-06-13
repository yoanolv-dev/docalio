import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Eye,
  FolderLock,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  DashboardPreview,
  DrivePreview,
  PortalPreview,
} from "@/components/marketing/app-preview";
import { HeroCanvas } from "@/components/marketing/hero-canvas";
import { Tilt, Reveal } from "@/components/marketing/scroll-fx";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { Faq } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "Docalio — L'espace documentaire client",
  description:
    "Un espace privé par client : déposez vos documents comme dans un Drive, partagez un lien sécurisé sans compte, suivez les consultations et recueillez les décisions.",
  alternates: { canonical: "/" },
};

const FEATURE_SECTIONS = [
  {
    eyebrow: "Votre Drive client",
    title: "Vos documents, rangés comme dans l'explorateur Windows",
    description:
      "Arborescence de dossiers, glisser-déposer, renommer, dupliquer, supprimer, vue grandes icônes ou détails. Rien à apprendre. Chaque fichier reste privé tant que vous ne le rendez pas visible — d'un seul clic.",
    points: [
      "Volet d'arborescence, fil d'Ariane et double-clic, comme à la maison",
      "Glissez vos fichiers pour les importer ou les déplacer",
      "« Visible client » en un clic, le reste demeure privé",
    ],
    Preview: DrivePreview,
  },
  {
    eyebrow: "Le portail client",
    title: "Un espace clair, à votre image, sans compte à créer",
    description:
      "Votre client ouvre un lien et comprend immédiatement quoi faire : consulter, télécharger, puis valider ou demander une modification. Vous suivez tout en temps réel.",
    points: [
      "Aucune inscription : un simple lien sécurisé",
      "Documents rangés par dossier, progression visible",
      "Décisions commentées : validé, à modifier, refusé",
    ],
    Preview: PortalPreview,
  },
];

const VALUES = [
  {
    icon: FolderLock,
    title: "Privé par défaut",
    text: "Stockage privé, liens expirables et révocables, téléchargement contrôlé fichier par fichier.",
  },
  {
    icon: Eye,
    title: "Vous savez où ça en est",
    text: "Ouvertures, consultations, téléchargements : fini les relances à l'aveugle.",
  },
  {
    icon: CheckCircle2,
    title: "Des décisions, pas des emails",
    text: "Validation, modification ou refus recueillis directement dans l'espace, avec commentaire.",
  },
];

const FAQ_ITEMS = [
  {
    question: "En quoi est-ce différent d'un Drive ou de WeTransfer ?",
    answer:
      "Docalio n'est pas un simple stockage. Chaque client a un espace privé, organisé en dossiers, que vous partagez via un lien — et où votre client consulte, télécharge et décide. Vous suivez tout, sans relancer à l'aveugle.",
  },
  {
    question: "Mes clients doivent-ils créer un compte ?",
    answer:
      "Non. L'accès se fait par un lien sécurisé unique, sans inscription. Vous gardez le contrôle : le lien est expirable et révocable à tout moment.",
  },
  {
    question: "Mes documents sont-ils réellement protégés ?",
    answer:
      "Oui. Le stockage est privé par défaut, l'accès aux fichiers passe par des liens signés temporaires, et chaque organisation est isolée des autres au niveau de la base de données.",
  },
  {
    question: "Comment fonctionne l'essai ?",
    answer:
      "Vous démarrez gratuitement pendant 14 jours, sans carte bancaire, avec l'ensemble des fonctionnalités.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero — scène WebGL + titre éditorial */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <HeroCanvas />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-background/50 via-background/75 to-background"
        />
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-28 text-center sm:px-6 sm:pt-36">
          <Link
            href="/fonctionnalites"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            Nouveau · Drive client façon explorateur
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <h1 className="text-balance mx-auto mt-6 max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
            Le bon document,
            <br />
            au bon client.
          </h1>
          <p className="text-pretty mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Un espace privé par client. Rangez vos documents comme dans
            l&apos;explorateur de votre ordinateur, partagez un lien sécurisé
            sans compte, recueillez les décisions — au même endroit.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-card/70 backdrop-blur" asChild>
              <Link href="/contact">Demander une démo</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            14 jours d&apos;essai · Sans carte bancaire
          </p>
        </div>

        {/* Aperçu produit live, incliné en 3D */}
        <div className="mx-auto -mb-8 max-w-6xl px-4 pb-16 [perspective:1600px] sm:px-6">
          <Tilt max={6}>
            <DashboardPreview />
          </Tilt>
        </div>
      </section>

      {/* Valeurs */}
      <Section muted className="py-14 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {VALUES.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title}>
                <Icon className="h-5 w-5 text-foreground" />
                <p className="mt-3 font-medium">{v.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {v.text}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Sections produit alternées, aperçus live inclinés */}
      {FEATURE_SECTIONS.map((s, i) => {
        const Preview = s.Preview;
        return (
          <Section key={s.title}>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={i % 2 === 1 ? "lg:order-2" : undefined}>
                <p className="text-sm font-semibold text-primary">{s.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {s.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal
                delay={80}
                className={cn("[perspective:1600px]", i % 2 === 1 && "lg:order-1")}
              >
                <Tilt max={6}>
                  <Preview />
                </Tilt>
              </Reveal>
            </div>
          </Section>
        );
      })}

      {/* Sécurité */}
      <Section muted>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Sécurité & confidentialité"
              title="La confiance, intégrée à l'architecture"
              description="Vos documents sont sensibles. Docalio est pensé pour les protéger par défaut, pas en option."
            />
            <Button className="mt-6" variant="outline" asChild>
              <Link href="/securite">
                Notre approche sécurité
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <ul className="space-y-3">
            {[
              { icon: FolderLock, text: "Stockage privé — aucun fichier public" },
              { icon: Lock, text: "Accès par liens signés temporaires" },
              { icon: ShieldCheck, text: "Isolation stricte entre organisations" },
              { icon: Eye, text: "Suivi respectueux de la vie privée (RGPD-friendly)" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.text}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <Icon className="h-4 w-4 shrink-0 text-foreground" />
                  <span className="text-sm font-medium">{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      {/* Comparaison */}
      <Section>
        <SectionHeading
          eyebrow="Pourquoi Docalio"
          title="Plus clair qu'un email. Plus actionnable qu'un Drive."
          description="Là où les outils génériques s'arrêtent au transfert, Docalio gère l'expérience client de bout en bout."
        />
        <div className="mt-10">
          <ComparisonTable />
        </div>
      </Section>

      {/* Tarifs */}
      <Section muted>
        <SectionHeading
          eyebrow="Tarifs"
          title="Un tarif simple, qui grandit avec vous"
          description="Sans engagement. Démarrez gratuitement, choisissez votre offre ensuite."
        />
        <div className="mt-12">
          <PricingCards plans={["starter", "pro", "business"]} />
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/tarifs">
              Voir le détail des offres
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />
        <div className="mt-10">
          <Faq items={FAQ_ITEMS} />
        </div>
      </Section>

      {/* CTA final */}
      <Section className="py-16 sm:py-20">
        <div className="rounded-3xl border border-border bg-foreground px-8 py-16 text-center text-background">
          <h2 className="text-balance mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Donnez à vos clients un espace à la hauteur de votre travail
          </h2>
          <p className="mx-auto mt-4 max-w-md text-background/70">
            Créez votre premier espace client sécurisé en quelques minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Commencer gratuitement</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
