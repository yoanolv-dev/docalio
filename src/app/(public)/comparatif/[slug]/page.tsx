import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Check, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { VerdictIcon } from "@/components/marketing/comparison-matrix";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { COMPARISONS, getComparison } from "@/lib/marketing/comparisons";
import { SITE } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return {};
  return {
    title: { absolute: `${c.seoTitle} | Docalio` },
    description: c.seoDescription,
    alternates: { canonical: `/comparatif/${c.slug}` },
    openGraph: { title: c.seoTitle, description: c.seoDescription, url: `/comparatif/${c.slug}` },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();
  const others = COMPARISONS.filter((o) => o.slug !== c.slug);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(SITE.url, [
          { name: "Accueil", path: "/" },
          { name: "Comparatifs", path: `/comparatif/${c.slug}` },
          { name: `Docalio vs ${c.competitor}`, path: `/comparatif/${c.slug}` },
        ])}
      />

      <section className="relative isolate -mt-16 overflow-hidden pt-16">
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(37,99,235,0.16),transparent_70%)]" />
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="text-sm font-semibold text-primary">Docalio vs {c.competitor}</p>
          <h1 className="text-balance mt-3 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">{c.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{c.intro}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full px-6" asChild>
              <Link href="/register">Essayer Docalio gratuitement <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <Section className="pt-6">
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-border bg-muted/40 p-6">
            <p className="flex items-center gap-2 font-semibold">
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
              Ce que {c.competitor} fait bien
            </p>
            <ul className="mt-4 space-y-2.5">
              {c.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary-subtle/40 p-6">
            <p className="font-semibold text-primary">Pourquoi choisir Docalio pour vos clients</p>
            <ul className="mt-4 space-y-4">
              {c.whyDocalio.map((w) => (
                <li key={w.title}>
                  <p className="font-medium">{w.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{w.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section muted>
        <SectionHeading title={`Docalio et ${c.competitor}, critère par critère`} />
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-4 text-left font-medium text-muted-foreground">Critère</th>
                <th scope="col" className="w-28 bg-primary-subtle/60 p-4 text-center font-semibold text-primary">Docalio</th>
                <th scope="col" className="w-36 p-4 text-center font-medium">{c.competitor}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.criterion} className="border-b border-border last:border-0">
                  <th scope="row" className="p-4 text-left font-normal">
                    {r.criterion}
                    {r.note && <span className="mt-0.5 block text-xs text-muted-foreground">{r.note}</span>}
                  </th>
                  <td className="bg-primary-subtle/60 p-4 text-center"><VerdictIcon v={r.docalio} strong /></td>
                  <td className="p-4 text-center"><VerdictIcon v={r.other} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">
          Comparaison limitée à l&apos;usage « portail documentaire client », d&apos;après les informations publiques disponibles. Les offres évoluent : vérifiez auprès de chaque éditeur.
        </p>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl rounded-3xl bg-[#0b1224] p-8 text-center text-white sm:p-12">
          <p className="text-sm font-semibold text-blue-300">Notre verdict</p>
          <p className="text-balance mt-3 text-xl font-medium leading-relaxed sm:text-2xl">{c.verdict}</p>
          <Button size="lg" variant="secondary" className="mt-8 rounded-full" asChild>
            <Link href="/register">Créer mon portail <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-12 text-center">
          <p className="text-sm font-medium">Autres comparatifs</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/comparatif/${o.slug}`} className="inline-block rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">
                  Docalio vs {o.competitor}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
