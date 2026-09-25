import { SettingsNav } from "@/components/settings/settings-nav";

/**
 * Cadre des Réglages : un volet de navigation à gauche (PC) et chaque section
 * sur sa propre page. Le contenu défile dans le <main> du dashboard.
 */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Réglages</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Abonnement, équipe et identité de votre organisation.
          </p>
        </div>
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
