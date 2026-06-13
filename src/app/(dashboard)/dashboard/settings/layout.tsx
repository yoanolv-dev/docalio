import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getCurrentMembership } from "@/lib/organizations";
import { vocabularyFor } from "@/lib/sectors";

/**
 * Cadre des Réglages : un volet de navigation à gauche (PC) et chaque section
 * sur sa propre page. Le contenu défile dans le <main> du dashboard.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await getCurrentMembership();
  const vocab = vocabularyFor(membership?.organization.usage_type);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Abonnement, équipe et identité de votre organisation.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {vocab.listTitle}
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-0 lg:self-start">
          <SettingsNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
