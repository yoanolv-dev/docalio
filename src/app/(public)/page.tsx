import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  CircleCheck,
  EyeOff,
  FolderTree,
  Globe2,
  Inbox,
  LockKeyhole,
  Palette,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { HeroCanvasLazy } from "@/components/marketing/hero-canvas-lazy";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { ProductFilm } from "@/components/marketing/product-film";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { ComparisonMatrix } from "@/components/marketing/comparison-matrix";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Reveal } from "@/components/marketing/scroll-fx";
import { Faq } from "@/components/marketing/faq";
import { JsonLd, faqJsonLd } from "@/components/seo/json-ld";
import { SOLUTIONS } from "@/lib/marketing/solutions";
import { PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Docalio — Portail client : collecte de pièces et validation de documents" },
  description: SITE.description,
  alternates: { canonical: "/" },
};


const BENTO = [
  {
    icon: Inbox,
    title: "Collecte de pièces",
    text: "Échéances, retards signalés, pièce refusée avec motif puis redéposée. La fin des « il me manque encore… ».",
    className: "md:col-span-2",
    accent: "from-violet-500/15",
  },
  {
    icon: CircleCheck,
    title: "Validation client",
    text: "Approuver, demander une modification, refuser — avec commentaire.",
    className: "",
    accent: "from-emerald-500/15",
  },
  {
    icon: Timer,
    title: "Suivi en temps réel",
    text: "Ouvertures, consultations, téléchargements et dépôts, horodatés.",
    className: "",
    accent: "from-sky-500/15",
  },
  {
    icon: EyeOff,
    title: "Consultation seule",
    text: "Faites lire un document sans permettre son téléchargement.",
    className: "",
    accent: "from-amber-500/15",
  },
  {
    icon: Palette,
    title: "À votre marque",
    text: "Logo et couleurs par client. Vos clients voient votre cabinet, pas un outil.",
    className: "",
    accent: "from-pink-500/15",
  },
  {
    icon: FolderTree,
    title: "Votre espace documentaire",
    text: "Dossiers, glisser-déposer, espaces internes et droits par groupe pour votre équipe.",
    className: "md:col-span-2",
    accent: "from-blue-500/15",
  },
];

const FAQ_ITEMS = [
  {
    question: "Mes clients doivent-ils créer un compte ?",
    answer:
      "Non. Ils ouvrent un lien sécurisé, propre à leur espace, depuis n'importe quel appareil. Vous pouvez le faire expirer ou le révoquer à tout moment.",
  },
  {
    question: "Qu'est-ce qui différencie Docalio d'un Drive, de SharePoint ou de J-Doc ?",
    answer:
      "Ces outils stockent et échangent des fichiers. Docalio organise la relation documentaire avec le client : ce qu'il doit déposer (avec échéances), ce qu'il doit valider, et où en est chaque dossier — le tout dans un portail à votre marque.",
  },
  {
    question: "Où sont hébergées mes données ?",
    answer:
      "Dans l'Union européenne (Francfort). Les fichiers sont dans un stockage privé et ne sont accessibles qu'au travers de liens signés, valables quelques secondes. Chaque organisation est isolée au niveau de la base de données.",
  },
  {
    question: "Combien ça coûte ?",
    answer: `Le forfait Découverte est gratuit. Essentiel est à ${PLANS.pro.priceEur} € HT/mois pour jusqu'à 3 utilisateurs, Cabinet à ${PLANS.business.priceEur} € HT/mois jusqu'à 10 utilisateurs. Deux mois offerts en annuel, et vos clients ne paient jamais.`,
  },
  {
    question: "Combien de temps pour démarrer ?",
    answer:
      "Environ cinq minutes : créez votre compte, votre premier espace client, cliquez sur les pièces types de votre métier et envoyez le lien.",
  },
  {
    question: "Est-ce une solution de signature électronique ?",
    answer:
      "Non. Docalio enregistre des validations tracées (approuvé, à modifier, refusé). Pour une signature à valeur probante, utilisez un prestataire de signature qualifié.",
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
            href="/fonctionnalites#collecte"
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pl-1 pr-3 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
              <Sparkles className="h-3 w-3" />
              Nouveau
            </span>
            Collecte de pièces avec échéances et relance ciblée
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <h1 className="text-balance mx-auto mt-7 max-w-4xl text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Vos clients déposent leurs pièces.{" "}
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              Sans que vous ayez à relancer.
            </span>
          </h1>
          <p className="text-pretty mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Docalio est le portail client des cabinets et agences : vous
            demandez les documents, votre client les dépose sans compte,
            valide les vôtres — et vous suivez chaque dossier en temps réel.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 rounded-full px-7 text-base shadow-[0_12px_30px_-10px_rgba(37,99,235,0.7)]" asChild>
              <Link href="/register">
                Créer mon portail gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 rounded-full bg-card/70 px-7 text-base backdrop-blur" asChild>
              <Link href="#produit">Voir le produit</Link>
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["Gratuit pour démarrer", "Sans carte bancaire", "Données hébergées dans l'UE", "Clients invités gratuits"].map((t) => (
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
          Pensé pour les métiers qui vivent de documents clients
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
            <p className="text-sm font-semibold text-primary">Le vrai coût des documents clients</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Ce n&apos;est pas le travail qui vous ralentit. C&apos;est d&apos;attendre les pièces.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Un relevé qui manque, un devis jamais ouvert, un « OK » perdu dans
              un fil d&apos;e-mails… Chaque dossier incomplet, c&apos;est une
              relance, une recherche, un retard. Multipliez par vos clients.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Pièces éparpillées entre e-mails, messageries et clés USB",
                "Aucune visibilité : « l'a-t-il seulement ouvert ? »",
                "Données sensibles envoyées en pièce jointe, sans contrôle",
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
                alt="Une conseillère échange avec sa cliente autour d'un ordinateur"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
            </div>
            <div className="absolute -bottom-6 left-6 right-6 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur sm:left-auto sm:w-72">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Inbox className="h-4 w-4 text-violet-600" />
                3 pièces reçues ce matin
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-4/5 rounded-full bg-primary" />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Dossier complet à 80 % — sans une seule relance.</p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ----------------------------------------------- Film : comment ça marche */}
      <Section muted id="comment-ca-marche">
        <SectionHeading
          eyebrow="Comment ça marche"
          title="Tout le parcours, en 25 secondes."
          description="Le cabinet à gauche, son client à droite. Aucun compte, aucune relance."
        />
        <div className="mt-12">
          <ProductFilm />
        </div>
      </Section>

      {/* ------------------------------------------------------- Le produit */}
      <Section id="produit">
        <SectionHeading
          eyebrow="Le produit"
          title="Tout le dossier client, sur une seule page."
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
          description="Pensé pour être compris en dix secondes par votre client, et adopté en cinq minutes par votre équipe."
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
      </Section>

      {/* --------------------------------------------------------- Métiers */}
      <Section>
        <SectionHeading
          eyebrow="Par métier"
          title="Des pièces types prêtes pour votre activité"
          description="Choisissez votre métier à l'inscription : les listes de pièces et les modèles de dossiers sont déjà là."
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
          title="Combien vous coûtent vraiment les relances ?"
          description="Ajustez selon votre cabinet. Toutes les hypothèses sont les vôtres."
        />
        <div className="mt-12">
          <RoiCalculator />
        </div>
      </Section>

      {/* ------------------------------------------------------ Comparatif */}
      <Section>
        <SectionHeading
          eyebrow="Pourquoi Docalio"
          title="Les autres stockent vos fichiers. Docalio fait avancer vos dossiers."
          description="SharePoint, J-Doc, Google Drive ou l'e-mail sont d'excellents outils — pour autre chose que la relation documentaire avec vos clients."
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
            <p className="text-sm font-semibold text-blue-300">Sécurité & confidentialité</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Conçu pour des documents qui ne doivent jamais fuiter.
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
              { icon: Globe2, t: "Hébergé dans l'UE", d: "Base de données et fichiers à Francfort." },
              { icon: LockKeyhole, t: "Stockage 100 % privé", d: "Aucun fichier public, accès par liens signés de quelques secondes." },
              { icon: ShieldCheck, t: "Isolation stricte", d: "Chaque organisation et chaque espace sont cloisonnés en base." },
              { icon: EyeOff, t: "Suivi respectueux", d: "Aucune adresse IP stockée, aucun traceur publicitaire." },
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
          title="Un forfait par cabinet. Vos clients ne paient jamais."
          description="Pas de facturation au siège qui explose à chaque embauche. Gratuit pour démarrer, sans engagement."
        />
        <div className="mt-12">
          <PricingCards plans={["starter", "pro", "business"]} />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Plus de 10 utilisateurs ou des besoins de conformité spécifiques ?{" "}
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
            Votre prochain dossier complet, sans une seule relance.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-blue-100">
            Créez votre portail, cliquez sur les pièces types de votre métier, envoyez le lien. C&apos;est tout.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="h-12 rounded-full px-7 text-base" asChild>
              <Link href="/register">
                Commencer gratuitement <ArrowRight className="h-4 w-4" />
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
