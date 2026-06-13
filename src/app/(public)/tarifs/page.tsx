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
    "Tarification simple au siège : Solo gratuit, Pro 9 €, Business 18 € par utilisateur et par mois, Enterprise sur devis. Les partages externes sont illimités et gratuits.",
  alternates: { canonical: "/tarifs" },
};

const PRICING_FAQ = [
  {
    question: "Y a-t-il un engagement ?",
    answer:
      "Non. Les offres sont sans engagement. Vous démarrez par un essai gratuit de 14 jours, puis choisissez l’offre adaptée à votre usage.",
  },
  {
    question: "Comment se passe le démarrage ?",
    answer:
      "Vous créez votre compte et explorez Docalio gratuitement, sans carte bancaire. Pendant la phase bêta, l’activation d’une offre payante se fait avec notre équipe.",
  },
  {
    question: "Que se passe-t-il si j’atteins une limite ?",
    answer:
      "Docalio vous prévient clairement (stockage, taille de fichier) et vous pouvez passer à une offre supérieure à tout moment. Vos espaces et vos partages externes restent illimités.",
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
        title="Au siège. Les partages externes restent gratuits."
        description="Vous ne payez que pour vos utilisateurs internes. Espaces et partages clients illimités, sans engagement, essai gratuit 14 jours, sans carte bancaire."
      />

      <Section className="pt-12 sm:pt-14">
        {/* Offre bêta */}
        <div className="mb-10 flex flex-col items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-subtle/50 px-5 py-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="text-sm">
              <span className="font-semibold">Offre bêta —</span> Pro à{" "}
              <span className="font-semibold">
                4,50 €/utilisateur/mois pendant 6 mois
              </span>
              , accompagnement à la mise en route offert.
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
          Prix hors taxes. L’offre Enterprise inclut des limites personnalisées,
          un accompagnement et des besoins de sécurité avancés.
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
