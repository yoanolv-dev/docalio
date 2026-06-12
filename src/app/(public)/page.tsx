import Link from "next/link";
import {
  ArrowRight,
  Users,
  ShieldCheck,
  Activity,
  CheckCircle,
  Bell,
  Lock,
  FolderLock,
  Eye,
  ScrollText,
  Briefcase,
  Building2,
} from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ProductPreview } from "@/components/marketing/product-preview";
import { FeatureCard } from "@/components/marketing/feature-card";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { Faq } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "Docalio — Le portail documentaire client sécurisé",
  description:
    "Arrêtez d’envoyer vos documents importants par email ou Drive. Offrez à vos clients un espace privé, sécurisé et traçable — et recueillez leurs décisions.",
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    icon: Users,
    title: "Espaces clients dédiés",
    description:
      "Un dossier privé et organisé pour chaque client ou projet, isolé des autres.",
  },
  {
    icon: Lock,
    title: "Portail client sécurisé",
    description:
      "Un lien unique, sans compte à créer, à votre image — plus pro qu’un email.",
  },
  {
    icon: Activity,
    title: "Suivi en temps réel",
    description:
      "Sachez quand vos documents sont ouverts et téléchargés, sans relancer à l’aveugle.",
  },
  {
    icon: CheckCircle,
    title: "Décisions client",
    description:
      "Validation, demande de modification ou refus — commentés, directement dans le portail.",
  },
  {
    icon: Bell,
    title: "Notifications & relances",
    description:
      "Soyez alerté au bon moment et relancez avec un message prêt à copier, contextualisé.",
  },
  {
    icon: ShieldCheck,
    title: "Confidentialité par défaut",
    description:
      "Stockage privé, liens expirables et révocables, téléchargement contrôlé document par document.",
  },
];

const STEPS = [
  {
    title: "Créez un espace & déposez vos documents",
    description:
      "Un espace par client ou dossier. Glissez vos fichiers : devis, contrats, rapports.",
  },
  {
    title: "Partagez un portail sécurisé",
    description:
      "Générez un lien unique, expirable, à votre image. Aucun compte requis pour le client.",
  },
  {
    title: "Suivez et recueillez les décisions",
    description:
      "Ouvertures, téléchargements, validations : tout est tracé. Relancez au bon moment.",
  },
];

const USE_CASES = [
  {
    icon: Briefcase,
    title: "Agences & freelances",
    description: "Propositions, livrables et validations dans un espace soigné.",
  },
  {
    icon: ScrollText,
    title: "Consultants & cabinets",
    description: "Rapports et dossiers sensibles partagés avec traçabilité.",
  },
  {
    icon: Building2,
    title: "Commerciaux B2B & PME",
    description: "Devis et contrats suivis, signés d’un retour client clair.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Docalio remplace-t-il mon Drive ou WeTransfer ?",
    answer:
      "Docalio n’est pas un simple stockage. C’est un portail orienté expérience client : chaque dossier devient un espace privé, suivi et actionnable, où votre client consulte, télécharge et décide.",
  },
  {
    question: "Mes clients doivent-ils créer un compte ?",
    answer:
      "Non. Vos clients accèdent au portail via un lien sécurisé unique, sans inscription. Vous gardez le contrôle : le lien est expirable et révocable à tout moment.",
  },
  {
    question: "Mes documents sont-ils réellement protégés ?",
    answer:
      "Oui. Le stockage est privé par défaut, l’accès aux fichiers passe par des liens signés temporaires, et chaque organisation est isolée des autres au niveau de la base de données.",
  },
  {
    question: "Comment fonctionne l’essai ?",
    answer:
      "Vous démarrez gratuitement pendant 14 jours, sans carte bancaire. Vous explorez l’ensemble des fonctionnalités avant de choisir une offre.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-12rem] -z-10 mx-auto h-[28rem] max-w-4xl rounded-full bg-primary-subtle opacity-70 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-5">Portail documentaire client B2B</Badge>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Vos documents clients méritent mieux qu’un{" "}
                <span className="text-primary">email ou un Drive</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Offrez à chaque client un espace privé, sécurisé et traçable.
                Partagez vos documents, suivez les ouvertures et recueillez les
                décisions — en un lien.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Démarrer gratuitement
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/contact">Demander une démo</Link>
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Essai gratuit 14 jours · Aucune carte bancaire requise
              </p>
            </div>
            <div className="lg:pl-4">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Bénéfices clés */}
      <Section className="py-12 sm:py-14">
        <div className="grid gap-6 sm:grid-cols-3">
          <ValueProp
            icon={ShieldCheck}
            title="Plus professionnel"
            text="Un portail à votre image qui inspire confiance dès le premier clic."
          />
          <ValueProp
            icon={Activity}
            title="Plus de visibilité"
            text="Vous savez enfin ce que votre client a vu, téléchargé et décidé."
          />
          <ValueProp
            icon={CheckCircle}
            title="Moins d’allers-retours"
            text="Validation, modification ou refus recueillis directement dans l’espace."
          />
        </div>
      </Section>

      {/* Comment ça marche */}
      <Section muted id="comment-ca-marche">
        <SectionHeading
          eyebrow="Comment ça marche"
          title="De vos fichiers à une décision client, en trois étapes"
          description="Pensé pour être compris et utilisé en quelques minutes."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-xl border border-border bg-card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Fonctionnalités */}
      <Section>
        <SectionHeading
          eyebrow="Fonctionnalités"
          title="Tout pour partager, suivre et faire décider"
          description="Une plateforme simple en surface, sérieuse en profondeur."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/fonctionnalites">
              Voir toutes les fonctionnalités
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Cas d'usage */}
      <Section muted>
        <SectionHeading
          eyebrow="Cas d’usage"
          title="Conçu pour ceux qui partagent des documents qui comptent"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {USE_CASES.map((u) => (
            <FeatureCard key={u.title} {...u} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/cas-usage">
              Explorer les cas d’usage
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Comparaison */}
      <Section>
        <SectionHeading
          eyebrow="Pourquoi Docalio"
          title="Plus professionnel qu’un email. Plus actionnable qu’un Drive."
          description="Là où les outils génériques s’arrêtent au transfert, Docalio gère l’expérience client de bout en bout."
        />
        <div className="mt-10">
          <ComparisonTable />
        </div>
      </Section>

      {/* Sécurité */}
      <Section muted>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Sécurité & confidentialité"
              title="La confiance, intégrée à l’architecture"
              description="Vos documents sont sensibles. Docalio est pensé pour les protéger par défaut, pas en option."
            />
            <Button className="mt-6" variant="outline" asChild>
              <Link href="/securite">
                Découvrir notre approche sécurité
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
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="text-sm font-medium">{item.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      {/* Tarifs (teaser) */}
      <Section>
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
      <Section muted>
        <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />
        <div className="mt-10">
          <Faq items={FAQ_ITEMS} />
        </div>
      </Section>

      {/* CTA final */}
      <Section>
        <div className="overflow-hidden rounded-2xl bg-primary px-8 py-14 text-center">
          <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">
            Transformez chaque dossier client en expérience claire et
            actionnable
          </h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
            Créez votre premier portail client sécurisé en quelques minutes.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Démarrer gratuitement</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/contact">Demander une démo</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}

function ValueProp({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle">
        <Icon className="h-5 w-5 text-primary" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}
