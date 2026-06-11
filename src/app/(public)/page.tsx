import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Shield,
  Bell,
  CheckCircle,
  ArrowRight,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Espaces clients dédiés",
    description:
      "Créez un espace personnalisé pour chaque client avec ses propres documents et accès sécurisés.",
  },
  {
    icon: Shield,
    title: "Partage sécurisé par token",
    description:
      "Chaque portail client est protégé par un lien unique et sécurisé, sans compte requis.",
  },
  {
    icon: CheckCircle,
    title: "Validation & refus",
    description:
      "Collectez les validations de vos clients directement depuis le portail, avec horodatage.",
  },
  {
    icon: Bell,
    title: "Relances automatiques",
    description:
      "Générez des relances intelligentes pour les documents en attente de validation.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Halo de fond subtil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-10rem] -z-10 mx-auto h-[24rem] max-w-3xl rounded-full bg-primary-subtle opacity-60 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:py-32">
          <div className="flex flex-col items-center text-center">
            <Badge variant="default" className="mb-6">
              Portail documentaire B2B
            </Badge>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Partagez vos documents.{" "}
              <span className="text-primary">Collectez les validations.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Docalio centralise la gestion documentaire client — espaces
              dédiés, partage sécurisé, suivi des consultations et validations
              en temps réel.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Démarrer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="#features">Voir les fonctionnalités</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Aucune carte bancaire requise · Gratuit pendant 14 jours
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-3 text-muted-foreground">
              Une plateforme simple et puissante pour gérer vos documents
              clients.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="overflow-hidden rounded-2xl bg-primary px-8 py-14 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary-foreground/70" />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">
            Prêt à simplifier vos échanges documentaires ?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
            Rejoignez les équipes qui font confiance à Docalio.
          </p>
          <Button size="lg" variant="secondary" className="mt-7" asChild>
            <Link href="/register">Créer un compte gratuit</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Docalio. Tous droits réservés.
          </p>
          <nav className="flex items-center gap-4">
            <Link
              href="/legal"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Mentions légales
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Confidentialité
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
