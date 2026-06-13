import Link from "next/link";
import type { Metadata } from "next";
import { Mail, Rocket, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact & démo",
  description:
    "Parlez à l’équipe Docalio ou demandez une démo. Découvrez comment offrir à vos clients un portail documentaire sécurisé et traçable.",
  alternates: { canonical: "/contact" },
};

const REASONS = [
  "Voir Docalio en action sur votre cas",
  "Profiter de l’offre bêta (Pro à 29 €/mois pendant 6 mois)",
  "Échanger sur vos exigences de sécurité",
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact & démo"
        title="Parlons de vos documents clients"
        description="Une question, un besoin spécifique ou l’envie d’une démo ? Notre équipe vous répond rapidement."
      />

      <Section className="pt-12 sm:pt-14">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <ContactForm />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle">
                <Rocket className="h-5 w-5 text-primary" />
              </span>
              <h2 className="mt-4 text-base font-semibold">
                Préférez démarrer tout de suite ?
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Créez votre compte et explorez Docalio gratuitement pendant 14
                jours, sans carte bancaire.
              </p>
              <Button className="mt-4 w-full" asChild>
                <Link href="/register">Créer mon compte</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold">Pourquoi nous contacter</h2>
              <ul className="mt-3 space-y-2">
                {REASONS.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{r}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a
                  href="mailto:contact@docalio.app"
                  className="transition-colors hover:text-foreground"
                >
                  contact@docalio.app
                </a>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
