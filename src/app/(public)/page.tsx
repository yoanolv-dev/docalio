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
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="flex flex-col items-center text-center">
          <Badge variant="secondary" className="mb-6">
            Portail documentaire B2B
          </Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Partagez vos documents.{" "}
            <span className="text-muted-foreground">
              Collectez les validations.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Docalio centralise la gestion documentaire client — espaces dédiés,
            partage sécurisé, suivi des consultations et validations en temps
            réel.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Démarrer gratuitement
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="#features">Voir les fonctionnalités</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Aucune carte bancaire requise · Gratuit pendant 14 jours
          </p>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-border bg-muted/30"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-3 text-muted-foreground">
              Une plateforme simple et puissante pour gérer vos documents
              clients.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl border border-border bg-primary px-8 py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary-foreground/60" />
          <h2 className="mt-4 text-2xl font-bold text-primary-foreground">
            Prêt à simplifier vos échanges documentaires ?
          </h2>
          <p className="mt-3 text-primary-foreground/70">
            Rejoignez les équipes qui font confiance à Docalio.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-6"
            asChild
          >
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
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mentions légales
            </Link>
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Confidentialité
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
