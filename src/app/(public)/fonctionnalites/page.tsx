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
  Inbox,
  CalendarClock,
  RotateCcw,
  Sparkles,
  FolderTree,
  Trash2,
  History,
  Search,
  Link2,
  KeyRound,
  CloudUpload,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureCard } from "@/components/marketing/feature-card";

export const metadata: Metadata = {
  title: "Fonctionnalités",
  description:
    "Un drive complet (dossiers, aperçu, versions, corbeille, recherche), des liens de partage sécurisés, des espaces clients à votre marque, la collecte de pièces et la validation de documents : toutes les fonctionnalités de Docalio.",
  alternates: { canonical: "/fonctionnalites" },
};

const GROUPS: {
  id?: string;
  eyebrow: string;
  title: string;
  items: { icon: typeof Users; title: string; description: string }[];
}[] = [
  {
    id: "drive",
    eyebrow: "Le Drive",
    title: "Un vrai drive, qui se prend en main comme votre ordinateur",
    items: [
      {
        icon: FolderTree,
        title: "Explorateur de fichiers",
        description:
          "Dossiers, glisser-déposer, clic droit, sélection multiple, tri. Tous les formats, jusqu'à 1 Go par fichier.",
      },
      {
        icon: ScanEye,
        title: "Aperçu intégré",
        description:
          "PDF, images, vidéos et audio s'ouvrent dans l'app, sans téléchargement. Navigation au clavier.",
      },
      {
        icon: History,
        title: "Versions de fichiers",
        description:
          "Remplacez un fichier : l'ancienne version est conservée. Retéléchargez-la ou rétablissez-la en un clic.",
      },
      {
        icon: Trash2,
        title: "Corbeille 30 jours",
        description:
          "Toute suppression est récupérable pendant 30 jours — un dossier se restaure avec tout son contenu.",
      },
      {
        icon: Search,
        title: "Recherche instantanée",
        description:
          "Ctrl K : retrouvez un fichier, un dossier ou un espace en tapant trois lettres.",
      },
      {
        icon: Gauge,
        title: "Gros fichiers, envoi direct",
        description:
          "Les fichiers partent directement vers le stockage sécurisé, en parallèle — sans limite de serveur intermédiaire.",
      },
    ],
  },
  {
    id: "liens",
    eyebrow: "Partage par lien",
    title: "Des liens de partage dignes de vos documents",
    items: [
      {
        icon: Link2,
        title: "Un lien pour tout",
        description:
          "Partagez un fichier, un dossier ou un espace entier. Révocable à tout moment, suivi des ouvertures inclus.",
      },
      {
        icon: KeyRound,
        title: "Mot de passe & expiration",
        description:
          "Protégez chaque lien par un mot de passe (haché, jamais stocké en clair) et une date d'expiration.",
      },
      {
        icon: CloudUpload,
        title: "Lien de dépôt inversé",
        description:
          "Autorisez le dépôt : vos interlocuteurs vous envoient des fichiers sans compte, directement au bon endroit.",
      },
      {
        icon: EyeOff,
        title: "Consultation seule",
        description:
          "Autorisez la lecture sans le téléchargement — fichier par fichier ou lien par lien.",
      },
    ],
  },
  {
    id: "portail",
    eyebrow: "Espaces clients & marque",
    title: "Votre marque, votre adresse, vos clients",
    items: [
      {
        icon: Users,
        title: "Espaces clients dédiés",
        description:
          "Un espace privé par client ou projet, avec ses documents, ses pièces à recevoir et ses accès.",
      },
      {
        icon: Globe2,
        title: "Sous-domaine inclus",
        description:
          "vous.docalio.com pour tous — et votre propre domaine (drive.votre-entreprise.fr) en Business.",
      },
      {
        icon: Palette,
        title: "À votre image",
        description:
          "Logo et couleurs par organisation et par client. Sans mention Docalio dès le plan Pro.",
      },
      {
        icon: Lock,
        title: "Aucun compte client",
        description:
          "Vos clients ouvrent un lien sécurisé, c'est tout. Rien à installer, rien à retenir.",
      },
    ],
  },
  {
    id: "collecte",
    eyebrow: "Collecte de pièces",
    title: "Vos clients vous envoient ce qu'il faut, quand il faut",
    items: [
      {
        icon: Inbox,
        title: "Liste de pièces à fournir",
        description:
          "Listez les documents attendus. Votre client les dépose depuis son espace, sans compte.",
      },
      {
        icon: Sparkles,
        title: "Pièces types par métier",
        description:
          "Relevés, factures, pièce d'identité… Les listes de votre activité en un clic.",
      },
      {
        icon: CalendarClock,
        title: "Échéances & retards",
        description:
          "Chaque pièce a une date limite ; les retards sont signalés automatiquement.",
      },
      {
        icon: RotateCcw,
        title: "Validation ou refus motivé",
        description:
          "Refusez une pièce illisible avec un motif : le client la redépose, vous êtes notifié.",
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
          "Chaque consultation, téléchargement et dépôt est tracé, en temps réel.",
      },
      {
        icon: CheckCircle,
        title: "Décisions client",
        description:
          "Approuver, demander une modification ou refuser, directement dans l'espace client.",
      },
      {
        icon: MessageSquare,
        title: "Commentaires",
        description:
          "Votre client précise sa demande : ses retours arrivent attachés au document.",
      },
      {
        icon: ListChecks,
        title: "Journal d'activité",
        description:
          "Dépôts, partages, renommages, suppressions : une chronologie claire par espace.",
      },
      {
        icon: Bell,
        title: "Notifications internes",
        description:
          "Soyez alerté dès qu'un lien est ouvert, une pièce déposée ou une décision reçue.",
      },
      {
        icon: Send,
        title: "Relances intelligentes",
        description:
          "Un message prêt à copier, adapté à l'état du dossier et au dernier signal client.",
      },
    ],
  },
  {
    eyebrow: "Équipe & contrôle",
    title: "Des accès précis, une équipe sereine",
    items: [
      {
        icon: Users,
        title: "Équipe & invités",
        description:
          "Invitez vos collaborateurs, et des invités externes limités à certains espaces, en lecture ou en édition.",
      },
      {
        icon: FileLock2,
        title: "Groupes & droits par espace",
        description:
          "Espaces internes cloisonnés : chacun ne voit que ce qui le concerne.",
      },
      {
        icon: ShieldCheck,
        title: "Double authentification",
        description:
          "MFA activable par chacun — et exigible pour toute l'organisation en Business.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Fonctionnalités"
        title="Stocker, partager, faire valider. Au même endroit."
        description="Docalio réunit un drive complet pour votre équipe et des partages irréprochables pour vos clients : liens sécurisés, espaces à votre marque, collecte de pièces et validations."
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
        <Section key={group.eyebrow} id={group.id} muted={i % 2 === 1}>
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
            Stockage privé hébergé dans l&apos;UE, liens signés temporaires,
            isolation stricte entre organisations, journal d&apos;activité et
            double authentification.
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
