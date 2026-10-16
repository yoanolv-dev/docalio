import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PageHero } from "@/components/marketing/page-hero";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Faq } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Le drive professionnel français : 5 Go offerts à vie, Pro 29 € HT/mois (200 Go, 10 utilisateurs), Business 79 € HT/mois (1 To, domaine personnalisé). 30 jours d'essai Pro, 2 mois offerts en annuel.",
  alternates: { canonical: "/tarifs" },
};

const PRICING_FAQ = [
  {
    question: "Y a-t-il un engagement ?",
    answer:
      "Non. Les forfaits mensuels sont sans engagement. Le plan Gratuit (5 Go) est sans limite de durée, et chaque inscription inclut 30 jours d'essai du plan Pro complet, sans carte bancaire.",
  },
  {
    question: "Comment se passe le démarrage ?",
    answer:
      "Vous créez votre compte, votre drive est prêt immédiatement avec 30 jours de plan Pro offerts. À la fin de l'essai, vous basculez automatiquement sur le plan Gratuit (5 Go) — rien n'est perdu. Pendant la phase bêta, l'activation d'une offre payante se fait avec notre équipe.",
  },
  {
    question: "Que se passe-t-il si j’atteins une limite ?",
    answer:
      "Docalio vous prévient clairement (stockage, utilisateurs) et vous passez au forfait supérieur en un instant. Vos données ne sont jamais bloquées ni supprimées.",
  },
  {
    question: "Pourquoi un forfait et pas un prix par utilisateur ?",
    answer:
      "Parce qu'une entreprise ne devrait pas payer plus cher à chaque embauche. Le forfait couvre votre équipe jusqu'à sa limite, et vos clients comme les destinataires de vos liens ne sont jamais facturés.",
  },
  {
    question: "Puis-je changer d’offre plus tard ?",
    answer:
      "Oui. Vous pouvez faire évoluer votre offre à la hausse comme à la baisse selon vos besoins. Contactez-nous pour tout ajustement.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Tarifs"
        title="5 Go offerts. Un forfait par organisation."
        description="Pas de facturation au siège. 30 jours d'essai Pro à l'inscription, sans carte bancaire, sans engagement — et deux mois offerts en annuel."
      />

      <Section className="pt-12 sm:pt-14">
        {/* Offre bêta */}
        <div className="mb-10 flex flex-col items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-subtle/50 px-5 py-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-sm">
              <span className="font-semibold">Offre de lancement —</span>{" "}
              <span className="font-semibold">
                -50 % pendant 3 mois
              </span>{" "}
              sur Pro et Business, et import de votre Drive ou Dropbox offert.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/contact">
              En profiter
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <PricingCards />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prix hors taxes, par organisation. L’offre Entreprise inclut des
          limites personnalisées, un accompagnement et des exigences de
          sécurité avancées.
        </p>
      </Section>

      <Section muted>
        <SectionHeading eyebrow="Questions fréquentes" title="Tarifs & démarrage" />
        <div className="mt-10">
          <Faq items={PRICING_FAQ} />
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            Une question sur l’offre adaptée à votre équipe ?
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/contact">
              Parler à notre équipe
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
