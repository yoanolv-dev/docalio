import Link from "next/link";
import type { Metadata } from "next";
import {
  Users,
  FileLock2,
  EyeOff,
  Lock,
  Palette,
  ScanEye,
  Activity,
  ListChecks,
  CheckCircle,
  MessageSquare,
  Bell,
  Send,
  Gauge,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureCard } from "@/components/marketing/feature-card";

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description:
    "Espaces clients, portail sécurisé, suivi, décisions, notifications et relances : tout ce que Docalio offre pour partager et faire valider vos documents.",
  alternates: { canonical: "/fonctionnalites" },
};

const GROUPS = [
  {
    eyebrow: "Organisation & documents",
    title: "Vos documents, structurés et maîtrisés",
    items: [
      {
        icon: Users,
        title: "Espaces clients dédiés",
        description:
          "Un dossier privé par client ou projet, avec ses documents et ses accès.",
      },
      {
        icon: FileLock2,
        title: "Documents sécurisés",
        description:
          "Upload chiffré au transport vers un stockage privé. Formats courants pris en charge.",
      },
      {
        icon: EyeOff,
        title: "Visibilité & téléchargement contrôlés",
        description:
          "Choisissez, document par document, ce qui est visible et téléchargeable.",
      },
    ],
  },
  {
    eyebrow: "Portail & expérience client",
    title: "Une expérience client qui inspire confiance",
    items: [
      {
        icon: Lock,
        title: "Portail sans compte",
        description:
          "Un lien unique et sécurisé. Votre client accède sans inscription.",
      },
      {
        icon: Palette,
        title: "À votre image",
        description:
          "Logo et couleur de votre organisation pour un rendu professionnel.",
      },
      {
        icon: ScanEye,
        title: "Prévisualisation intégrée",
        description:
          "Vos clients consultent les documents en ligne avant de décider.",
      },
    ],
  },
  {
    eyebrow: "Suivi & décision",
    title: "Sachez ce qui se passe, recueillez des réponses",
    items: [
      {
        icon: Activity,
        title: "Suivi des ouvertures & téléchargements",
        description:
          "Chaque consultation et téléchargement est tracé, en temps réel.",
      },
      {
        icon: ListChecks,
        title: "Timeline d’activité",
        description:
          "Une chronologie claire de l’engagement de votre client sur le dossier.",
      },
      {
        icon: CheckCircle,
        title: "Décisions client",
        description:
          "Approuver, demander une modification ou refuser, directement dans le portail.",
      },
      {
        icon: MessageSquare,
        title: "Commentaires",
        description:
          "Votre client précise sa demande : ses retours arrivent attachés au document.",
      },
    ],
  },
  {
    eyebrow: "Pilotage & action",
    title: "Restez maître de chaque dossier",
    items: [
      {
        icon: Bell,
        title: "Notifications internes",
        description:
          "Soyez alerté dès qu’un portail est ouvert, un fichier téléchargé ou une décision reçue.",
      },
      {
        icon: Send,
        title: "Relances intelligentes",
        description:
          "Un message prêt à copier, adapté à l’état du dossier et au dernier signal client.",
      },
      {
        icon: Gauge,
        title: "Plans, quotas & usage",
        description:
          "Stockage, espaces actifs et utilisateurs suivis clairement dans vos paramètres.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Fonctionnalités"
        title="Tout pour partager, suivre et faire décider"
        description="Docalio couvre le cycle complet : du dépôt d’un document à la décision de votre client, avec sécurité et clarté."
      >
        <Button size="lg" asChild>
          <Link href="/register">
            Démarrer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/tarifs">Voir les tarifs</Link>
        </Button>
      </PageHero>

      {GROUPS.map((group, i) => (
        <Section key={group.eyebrow} muted={i % 2 === 1}>
          <SectionHeading
            align="left"
            eyebrow={group.eyebrow}
            title={group.title}
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </Section>
      ))}

      {/* Sécurité — renvoi */}
      <Section muted={GROUPS.length % 2 === 1}>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-subtle">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </span>
          <h2 className="text-xl font-semibold tracking-tight">
            La sécurité, au cœur du produit
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Stockage privé, liens signés temporaires, isolation stricte entre
            organisations et suivi respectueux de la vie privée.
          </p>
          <Button variant="outline" asChild>
            <Link href="/securite">
              Voir le Trust Center
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
