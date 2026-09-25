import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, CalendarClock, Check, CircleCheck, CloudUpload, Hourglass, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Faq } from "@/components/marketing/faq";
import { Reveal } from "@/components/marketing/scroll-fx";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/seo/json-ld";
import { SOLUTIONS, getSolution } from "@/lib/marketing/solutions";
import { COMPARE_NAV, SITE } from "@/lib/site";
import { PLANS } from "@/lib/plans";

export const dynamicParams = false;

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = getSolution(slug);
  if (!s) return {};
  return {
    title: { absolute: `${s.seoTitle} | Docalio` },
    description: s.seoDescription,
    alternates: { canonical: `/solutions/${s.slug}` },
    openGraph: {
      title: s.seoTitle,
      description: s.seoDescription,
      url: `/solutions/${s.slug}`,
      images: [{ url: s.image, width: 1600, height: 1067, alt: s.imageAlt }],
    },
  };
}

const STATUS_DEMO = [
  { icon: CircleCheck, label: "Validée", tone: "bg-emerald-50 text-emerald-700" },
  { icon: Hourglass, label: "À valider", tone: "bg-violet-50 text-violet-700" },
  { icon: CloudUpload, label: "En attente", tone: "bg-muted text-muted-foreground" },
  { icon: TriangleAlert, label: "En retard", tone: "bg-red-50 text-red-700" },
  { icon: CloudUpload, label: "En attente", tone: "bg-muted text-muted-foreground" },
];

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getSolution(slug);
  if (!s) notFound();

  const others = SOLUTIONS.filter((o) => o.slug !== s.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(SITE.url, [
            { name: "Accueil", path: "/" },
            { name: "Solutions", path: `/solutions/${s.slug}` },
            { name: s.name, path: `/solutions/${s.slug}` },
          ]),
          faqJsonLd(s.faq),
        ]}
      />

      {/* Hero */}
      <section className="relative isolate -mt-16 overflow-hidden pt-16">
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(50%_60%_at_20%_0%,rgba(37,99,235,0.16),transparent_70%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div className="animate-fade-up">
            <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Accueil</Link>
              <span className="mx-1.5">/</span>
              <span>Solutions</span>
              <span className="mx-1.5">/</span>
              <span className="text-foreground">{s.name}</span>
            </nav>
            <p className="mt-6 text-sm font-semibold text-primary">{s.eyebrow}</p>
            <h1 className="text-balance mt-2 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              {s.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{s.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full px-6" asChild>
                <Link href="/register">
                  Essayer gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-6" asChild>
                <Link href="/contact">Demander une démo</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Gratuit pour démarrer · puis dès {PLANS.pro.priceYearlyEur} € HT/mois · clients invités gratuits
            </p>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-[0_40px_90px_-40px_rgba(15,23,42,0.6)]">
              <Image src={s.image} alt={s.imageAlt} fill priority sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
            </div>
            {/* Aperçu : la liste de pièces du métier, prête en un clic */}
            <div className="animate-pop-in absolute -bottom-8 -left-4 w-[min(320px,90%)] rounded-2xl border border-border bg-card p-4 shadow-2xl sm:-left-10" style={{ animationDelay: "400ms" }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pièces demandées</p>
              <ul className="mt-2.5 space-y-1.5">
                {s.requestExamples.slice(0, 5).map((r, i) => {
                  const st = STATUS_DEMO[i % STATUS_DEMO.length];
                  return (
                    <li key={r} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{r}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.tone}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Douleurs */}
      <Section muted className="pt-20">
        <SectionHeading eyebrow="Ce qui vous freine aujourd'hui" title="On connaît la chanson." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {s.pains.map((p, i) => (
            <Reveal key={p.title} delay={i * 80} className="rounded-2xl border border-border bg-card p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-600">
                {i + 1}
              </span>
              <h2 className="mt-4 font-semibold">{p.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Solution */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Avec Docalio"
              title="Chaque client a son portail. Chaque pièce a son statut."
            />
            <ul className="mt-8 space-y-4">
              {s.outcomes.map((o) => (
                <li key={o} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-base">{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <Reveal className="rounded-3xl border border-border bg-card p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.4)]">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-primary" />
              Pièces types « {s.name} », prêtes en un clic
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.requestExamples.map((r) => (
                <span key={r} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-sm">
                  + {r}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Ajoutez-les à un espace client, fixez une échéance, envoyez le lien. Vous êtes notifié à chaque dépôt.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section muted>
        <SectionHeading eyebrow="Questions fréquentes" title={`Docalio pour les ${s.name.toLowerCase()}`} />
        <div className="mt-10">
          <Faq items={s.faq} />
        </div>
      </Section>

      {/* Maillage */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Autres métiers</h2>
            <ul className="mt-4 space-y-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/solutions/${o.slug}`} className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    {o.name} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Comparer</h2>
            <ul className="mt-4 space-y-2">
              {COMPARE_NAV.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                    {c.label} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
