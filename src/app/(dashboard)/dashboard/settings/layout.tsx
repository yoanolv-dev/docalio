import { SettingsNav } from "@/components/settings/settings-nav";
import { getCurrentMembership } from "@/lib/organizations";

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
  const guest = membership?.role === "guest";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{guest ? "Mon compte" : "Réglages"}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {guest ? "La sécurité de votre compte." : "Abonnement, équipe, sécurité et identité de votre organisation."}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-0 lg:self-start">
          <SettingsNav guest={guest} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
