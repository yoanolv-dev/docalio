import Link from "next/link";
import type { Metadata } from "next";
import {
  FolderLock,
  Link2,
  Timer,
  Network,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureCard } from "@/components/marketing/feature-card";

export const metadata: Metadata = {
  title: "Sécurité — Trust Center",
  description:
    "Stockage privé, liens signés, isolation multi-tenant et suivi respectueux de la vie privée. Découvrez comment Docalio protège vos documents clients.",
  alternates: { canonical: "/securite" },
};

const PRINCIPLES = [
  {
    icon: FolderLock,
    title: "Stockage privé par défaut",
    description:
      "Aucun fichier n’est public. Vos documents vivent dans un stockage privé, jamais exposé directement sur le web.",
  },
  {
    icon: Link2,
    title: "Accès par liens signés",
    description:
      "Les fichiers ne sont accessibles que via des URLs signées à durée de vie courte, générées à la demande côté serveur.",
  },
  {
    icon: Timer,
    title: "Liens de partage expirables",
    description:
      "Chaque portail repose sur un lien unique, révocable et expirable à tout moment. Vous gardez le contrôle.",
  },
  {
    icon: Network,
    title: "Isolation multi-tenant",
    description:
      "La sécurité au niveau des lignes (RLS) isole strictement les données de chaque organisation. Aucune fuite inter-organisation.",
  },
  {
    icon: EyeOff,
    title: "Téléchargement contrôlé",
    description:
      "Vous décidez, document par document, de ce qui est visible et de ce qui peut être téléchargé.",
  },
  {
    icon: ShieldCheck,
    title: "Suivi respectueux",
    description:
      "Le suivi d’activité est pensé pour la confidentialité : utile pour vous, discret pour vos clients.",
  },
];

const PRIVACY_NO = [
  "Aucune adresse IP brute stockée",
  "Aucun fingerprint agressif",
  "Aucune donnée personnelle superflue",
];

const PRIVACY_YES = [
  "Identifiant visiteur aléatoire et anonyme",
  "Analytics internes, jamais montrées au client",
  "Données limitées au strict nécessaire",
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Trust Center"
        title="La confiance, intégrée à l’architecture"
        description="Vos documents sont sensibles. Docalio est conçu pour les protéger par défaut — pas en option."
      >
        <Button size="lg" asChild>
          <Link href="/register">
            Démarrer en confiance
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </PageHero>

      <Section>
        <SectionHeading
          eyebrow="Principes"
          title="Une sécurité concrète, pas un argument marketing"
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <FeatureCard key={p.title} {...p} />
          ))}
        </div>
      </Section>

      <Section muted>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Vie privée"
              title="Un suivi utile, sans surveillance"
              description="Docalio vous indique si un client a ouvert ou téléchargé un document, sans collecter de données intrusives."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold">Ce que nous ne faisons pas</p>
              <ul className="mt-3 space-y-2">
                {PRIVACY_NO.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold">Ce que nous faisons</p>
              <ul className="mt-3 space-y-2">
                {PRIVACY_YES.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Transparence */}
      <Section>
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8">
          <h2 className="text-lg font-semibold">Transparence</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nous n’affichons aucune certification que nous ne détenons pas.
            Docalio applique des principes de sécurité solides dès aujourd’hui ;
            les démarches de conformité (par exemple un hébergement certifié)
            font partie de notre feuille de route et ne seront communiquées que
            lorsqu’elles seront effectives.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Une question précise sur notre architecture ou vos exigences de
            sécurité ? Notre équipe vous répond directement.
          </p>
          <Button className="mt-5" variant="outline" asChild>
            <Link href="/contact">
              Contacter l’équipe sécurité
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
