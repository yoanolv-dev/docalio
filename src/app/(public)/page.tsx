import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  CircleCheck,
  CloudUpload,
  EyeOff,
  FolderTree,
  Globe2,
  History,
  Inbox,
  KeyRound,
  Link2,
  LockKeyhole,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { HeroCanvasLazy } from "@/components/marketing/hero-canvas-lazy";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { ComparisonMatrix } from "@/components/marketing/comparison-matrix";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Reveal } from "@/components/marketing/scroll-fx";
import { Faq } from "@/components/marketing/faq";
import { JsonLd, faqJsonLd } from "@/components/seo/json-ld";
import { SOLUTIONS } from "@/lib/marketing/solutions";
import { PLANS, TRIAL_DAYS, formatStorage } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute:
      "Docalio — Le drive professionnel français : fichiers, clients, marque",
  },
  description: SITE.description,
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    icon: CloudUpload,
    title: "Déposez",
    text: "Glissez vos fichiers et dossiers comme sur votre ordinateur. Aperçu intégré, corbeille 30 jours, versions conservées à chaque remplacement.",
  },
  {
    icon: Link2,
    title: "Partagez",
    text: "Un lien sécurisé pour un fichier ou un dossier — mot de passe, expiration, dépôt inversé. Ou un espace client complet, à votre marque.",
  },
  {
    icon: Bell,
    title: "Suivez",
    text: "Ouvertures, téléchargements, dépôts, validations : tout est horodaté. Vous savez qui a vu quoi, et qui relancer.",
  },
];

const BENTO = [
  {
    icon: FolderTree,
    title: "Un vrai drive",
    text: "Dossiers, glisser-déposer, sélection multiple, clic droit, recherche instantanée. Tous les formats de fichiers, jusqu'à 1 Go par fichier.",
    className: "md:col-span-2",
    accent: "from-blue-500/15",
  },
  {
    icon: Link2,
    title: "Liens sécurisés",
    text: "Mot de passe, expiration, téléchargement au choix, dépôt de fichiers inversé — et révocation en un clic.",
    className: "",
    accent: "from-violet-500/15",
  },
  {
    icon: History,
    title: "Versions & corbeille",
    text: "Chaque remplacement garde l'ancienne version. Les suppressions se restaurent pendant 30 jours.",
    className: "",
    accent: "from-emerald-500/15",
  },
  {
    icon: Palette,
    title: "Votre marque, votre domaine",
    text: "Espaces clients sur vous.docalio.com — ou votre propre domaine. Vos clients voient votre entreprise, pas un outil.",
    className: "",
    accent: "from-pink-500/15",
  },
  {
    icon: Inbox,
    title: "Collecte & validation",
    text: "Demandez des pièces avec échéances, faites approuver vos documents. Vos clients n'ont aucun compte à créer.",
    className: "md:col-span-2",
    accent: "from-amber-500/15",
  },
];

const FAQ_ITEMS = [
  {
    question: "En quoi Docalio est-il différent de Google Drive ou Dropbox ?",
    answer:
      "Google Drive et Dropbox sont des disques durs en ligne pensés pour un usage généraliste. Docalio est pensé pour le travail avec vos clients : liens protégés par mot de passe avec suivi d'ouverture, espaces clients à votre marque sur votre sous-domaine, collecte de pièces avec échéances et validation de documents — le tout hébergé en Europe, avec un prix par organisation et non par utilisateur.",
  },
  {
    question: "Le plan Gratuit est-il vraiment gratuit ?",
    answer: `Oui : ${formatStorage(PLANS.starter.limits.storageBytes)} par organisation, jusqu'à ${PLANS.starter.limits.users} utilisateurs, espaces et liens sécurisés illimités, sans limite de durée et sans carte bancaire. À l'inscription, vous profitez en plus de ${TRIAL_DAYS} jours d'essai du plan Pro complet.`,
  },
  {
    question: "Mes clients doivent-ils créer un compte ?",
    answer:
      "Non, jamais. Ils ouvrent un lien sécurisé — protégé par mot de passe si vous le souhaitez — depuis n'importe quel appareil. Vous pouvez faire expirer ou révoquer chaque lien à tout moment.",
  },
  {
    question: "C'est quoi, le sous-domaine inclus ?",
    answer:
      "Chaque organisation dispose de son adresse : votre-entreprise.docalio.com. Vos clients y retrouvent un accueil à vos couleurs et vos espaces partagés. Le plan Business permet d'aller plus loin avec votre propre domaine (drive.votre-entreprise.fr).",
  },
  {
    question: "Où sont hébergées mes données ?",
    answer:
      "Dans l'Union européenne (Francfort). Les fichiers sont dans un stockage privé, accessibles uniquement par des liens signés de quelques minutes. Chaque organisation est isolée au niveau de la base de données, la double authentification peut être exigée, et chaque action est journalisée.",
  },
  {
    question: "Combien ça coûte ?",
    answer: `Le plan Gratuit offre ${formatStorage(PLANS.starter.limits.storageBytes)}. Pro est à ${PLANS.pro.priceEur} € HT/mois pour toute l'organisation (jusqu'à ${PLANS.pro.limits.users} utilisateurs, ${formatStorage(PLANS.pro.limits.storageBytes)}), Business à ${PLANS.business.priceEur} € HT/mois (${formatStorage(PLANS.business.limits.storageBytes)}, utilisateurs illimités, domaine personnalisé). Deux mois offerts en annuel — et vos clients ne paient jamais.`,
  },
  {
    question: "Puis-je migrer depuis Google Drive, Dropbox ou un serveur ?",
    answer:
      "Oui : importez vos dossiers par simple glisser-déposer — l'arborescence est recréée automatiquement. Pour les gros volumes, l'offre Entreprise inclut un accompagnement d'import.",
  },
];

const METIERS = [
  "Experts-comptables",
  "Avocats",
  "Notaires",
  "Agences web",
  "Studios créatifs",
  "Agences immobilières",
  "Consultants",
  "Architectes",
  "Artisans du bâtiment",
  "Courtiers",
  "Freelances",
  "Gestionnaires de patrimoine",
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Docalio",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: SITE.url,
            description: SITE.description,
            offers: [PLANS.starter, PLANS.pro, PLANS.business].map((p) => ({
              "@type": "Offer",
              name: p.name,
              price: String(p.priceEur ?? 0),
              priceCurrency: "EUR",
            })),
          },
          faqJsonLd(FAQ_ITEMS),
        ]}
      />

      {/* ------------------------------------------------------------ Hero */}
      <section className="relative isolate -mt-16 overflow-hidden pt-16">
        <div className="absolute inset-0 -z-20 opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]">
          <HeroCanvasLazy />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(55%_55%_at_50%_0%,rgba(37,99,235,0.20),transparent_72%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_50%_at_50%_20%,black,transparent)]"
        />

        <div className="mx-auto max-w-5xl px-4 pb-14 pt-20 text-center sm:px-6 sm:pt-28">
          <Link
            href="/fonctionnalites#drive"
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1 pr-3 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              Nouveau
            </span>
            Aperçu intégré, versions de fichiers, corbeille & liens protégés
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <h1 className="text-balance mx-auto mt-7 max-w-4xl text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Le drive professionnel{" "}
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              français.
            </span>
          </h1>
          <p className="text-pretty mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Stockez, organisez et partagez vos fichiers par liens sécurisés.
            Ouvrez des espaces clients à votre marque, sur votre propre
            adresse. Collectez les pièces, faites valider vos documents —
            le tout hébergé en Europe.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-full px-7 text-base shadow-[0_12px_30px_-10px_rgba(37,99,235,0.7)]" asChild>
              <Link href="/register">
                Démarrer gratuitement — 5 Go offerts
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full bg-card/70 px-7 text-base backdrop-blur" asChild>
              <Link href="#produit">Voir le produit</Link>
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {[
              `${TRIAL_DAYS} jours d'essai Pro inclus`,
              "Sans carte bancaire",
              "Sous-domaine vous.docalio.com inclus",
              "Hébergé dans l'Union européenne",
            ].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <CircleCheck className="h-3.5 w-3.5 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-4 pb-20 sm:px-6">
          <HeroVisual />
        </div>
      </section>

      {/* ---------------------------------------------------- Bandeau métiers */}
      <section aria-label="Métiers" className="border-y border-border bg-muted/30 py-5">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Adopté par les métiers qui vivent de fichiers et de clients
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <ul className="animate-marquee flex w-max gap-10 whitespace-nowrap">
            {[...METIERS, ...METIERS].map((m, i) => (
              <li key={i} aria-hidden={i >= METIERS.length} className="text-lg font-semibold tracking-tight text-foreground/35">
                {m}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------ Le problème */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold text-primary">Pourquoi changer de drive</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Vos fichiers méritent mieux qu&apos;un disque dur en ligne.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Les drives généralistes stockent. Mais dès qu&apos;un client entre
              en jeu — un dossier à partager, une pièce à récupérer, un
              document à faire valider — tout repart dans les e-mails,
              les relances et les pièces jointes.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Des liens de partage impossibles à suivre : qui a ouvert quoi ?",
                "Aucune image de marque : votre client voit Google, pas vous",
                "Facturation au siège qui explose à chaque embauche",
                "Données professionnelles hébergées hors d'Europe",
              ].map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={100} className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-[0_40px_90px_-40px_rgba(15,23,42,0.6)]">
              <Image
                src="/images/relation-client.jpg"
                alt="Une professionnelle partage un dossier avec sa cliente autour d'un ordinateur"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur sm:left-auto sm:w-72">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="h-4 w-4 text-primary" />
                Lien ouvert par votre client
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-4/5 rounded-full bg-primary" />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Dossier consulté, 3 fichiers téléchargés — vous le savez en direct.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* --------------------------------------------------- Comment ça marche */}
      <Section muted>
        <SectionHeading
          eyebrow="Comment ça marche"
          title="Déposez. Partagez. Suivez."
          description="Prise en main immédiate : si vous savez utiliser un ordinateur, vous savez utiliser Docalio."
        />
        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={i * 90} className="relative text-center">
                <div>
                  <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-primary shadow-md ring-1 ring-border">
                    <Icon className="h-6 w-6" />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ------------------------------------------------------- Le produit */}
      <Section id="produit">
        <SectionHeading
          eyebrow="Le produit"
          title="Un drive qui travaille pour vous."
          description="Des vraies captures du produit — pas des maquettes."
        />
        <div className="mt-12">
          <ProductShowcase />
        </div>
      </Section>

      {/* ----------------------------------------------------------- Bento */}
      <Section muted>
        <SectionHeading
          eyebrow="Fonctionnalités"
          title="Tout ce qu'il faut. Rien qui complique."
          description="Un drive complet pour votre équipe, des partages irréprochables pour vos clients."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {BENTO.map((b, i) => {
            const Icon = b.icon;
            return (
              <Reveal
                key={b.title}
                delay={i * 60}
                className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${b.className}`}
              >
                <div aria-hidden className={`absolute inset-0 bg-gradient-to-br ${b.accent} to-transparent opacity-60 transition-opacity group-hover:opacity-100`} />
                <div className="relative">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card shadow-sm ring-1 ring-border">
                    <Icon className="h-5 w-5 text-foreground" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {[
            { icon: Search, t: "Recherche instantanée (Ctrl K)" },
            { icon: Trash2, t: "Corbeille 30 jours" },
            { icon: KeyRound, t: "Liens à mot de passe" },
            { icon: EyeOff, t: "Consultation sans téléchargement" },
          ].map((x) => {
            const Icon = x.icon;
            return (
              <span key={x.t} className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-primary" />
                {x.t}
              </span>
            );
          })}
        </div>
      </Section>

      {/* --------------------------------------------------------- Métiers */}
      <Section>
        <SectionHeading
          eyebrow="Par métier"
          title="Prêt pour votre activité, dès l'inscription"
          description="Choisissez votre métier : les listes de pièces types et les modèles de dossiers sont déjà là."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((s, i) => (
            <Reveal key={s.slug} delay={i * 50}>
              <Link
                href={`/solutions/${s.slug}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-3xl"
              >
                <Image
                  src={s.image}
                  alt={s.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-lg font-semibold">{s.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-white/75">{s.requestExamples.slice(0, 3).join(" · ")}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-white/90 transition-transform group-hover:translate-x-1">
                    Découvrir <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ------------------------------------------------------------ ROI */}
      <Section muted id="calculateur">
        <SectionHeading
          eyebrow="Calculez votre gain"
          title="Combien vous coûtent vraiment les échanges de fichiers ?"
          description="Relances, recherches, pièces perdues : ajustez selon votre structure, toutes les hypothèses sont les vôtres."
        />
        <div className="mt-12">
          <RoiCalculator />
        </div>
      </Section>

      {/* ------------------------------------------------------ Comparatif */}
      <Section>
        <SectionHeading
          eyebrow="Pourquoi Docalio"
          title="Les autres stockent vos fichiers. Docalio travaille avec vos clients."
          description="Google Drive, Dropbox, SharePoint ou l'e-mail sont d'excellents outils — pour autre chose que la relation documentaire professionnelle."
        />
        <div className="mt-12">
          <ComparisonMatrix />
        </div>
      </Section>

      {/* -------------------------------------------------------- Sécurité */}
      <section className="relative isolate overflow-hidden bg-[#0b1224] text-white">
        <Image
          src="/images/signature.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover opacity-20"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b1224] via-[#0b1224]/90 to-[#0b1224]/60" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-blue-300">Sécurité & souveraineté</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Un drive conçu pour des fichiers qui ne doivent jamais fuiter.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              La protection n&apos;est pas une option : elle est dans l&apos;architecture.
            </p>
            <Button className="mt-8 rounded-full" variant="secondary" asChild>
              <Link href="/securite">
                Notre approche sécurité <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Globe2, t: "Hébergé dans l'UE", d: "Base de données et fichiers à Francfort — jamais hors d'Europe." },
              { icon: LockKeyhole, t: "Stockage 100 % privé", d: "Aucun fichier public, accès par liens signés de quelques minutes." },
              { icon: ShieldCheck, t: "Double authentification", d: "MFA activable par chacun, et exigible pour toute l'organisation." },
              { icon: EyeOff, t: "Journal d'activité", d: "Chaque dépôt, partage et suppression est tracé. Aucune IP stockée." },
            ].map((x) => {
              const Icon = x.icon;
              return (
                <li key={x.t} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur">
                  <Icon className="h-5 w-5 text-blue-300" />
                  <p className="mt-3 font-semibold">{x.t}</p>
                  <p className="mt-1 text-sm text-slate-400">{x.d}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- Tarifs */}
      <Section id="tarifs">
        <SectionHeading
          eyebrow="Tarifs"
          title="5 Go offerts. Un forfait par organisation."
          description={`Pas de facturation au siège qui explose à chaque embauche. ${TRIAL_DAYS} jours d'essai Pro à l'inscription, sans carte bancaire, sans engagement.`}
        />
        <div className="mt-12">
          <PricingCards plans={["starter", "pro", "business"]} />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Des volumes importants ou des besoins de conformité spécifiques ?{" "}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            Parlons de l&apos;offre Entreprise
          </Link>
        </p>
      </Section>

      {/* ------------------------------------------------------------- FAQ */}
      <Section muted>
        <SectionHeading eyebrow="FAQ" title="Vos questions, nos réponses" />
        <div className="mt-10">
          <Faq items={FAQ_ITEMS} />
        </div>
      </Section>

      {/* ------------------------------------------------------- CTA final */}
      <Section className="py-20">
        <div className="relative isolate overflow-hidden rounded-[2rem] px-6 py-20 text-center text-white sm:px-16">
          <Image src="/images/succes.jpg" alt="" fill sizes="(min-width: 1152px) 1104px, 100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-700/95 via-blue-800/90 to-slate-950/90" />
          <h2 className="text-balance mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Votre drive, à votre marque, en cinq minutes.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-blue-100">
            5 Go offerts pour toujours, {TRIAL_DAYS} jours de Pro pour tout
            essayer. Importez vos dossiers, envoyez votre premier lien.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="h-12 rounded-full px-7 text-base" asChild>
              <Link href="/register">
                Créer mon drive gratuitement <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Link href="/contact" className="text-sm font-medium text-white/90 underline-offset-4 hover:underline">
              ou demander une démo de 20 minutes
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
