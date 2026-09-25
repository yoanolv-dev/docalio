import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, FolderClosed, Link2, Plus, Clock, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { listWorkspacesWithMeta } from "@/lib/workspaces";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { vocabularyFor } from "@/lib/sectors";

export const metadata: Metadata = {
  title: "Espaces",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const workspaces = await listWorkspacesWithMeta();
  const usageType = membership.organization.usage_type;
  const vocab = vocabularyFor(usageType);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ?? null;

  // Aperçu calme : trois repères dérivés des métadonnées déjà chargées
  // (aucune requête supplémentaire). Donne au tableau de bord une lecture
  // « centre de pilotage » sans surcharge visuelle.
  const liveSpaces = workspaces.filter((w) => w.status !== "archived").length;
  const sharedPortals = workspaces.filter((w) => w.hasActiveLink).length;
  const pendingDecisions = workspaces.reduce(
    (sum, w) => sum + w.pendingDecisions,
    0
  );
  const openRequests = workspaces.reduce((sum, w) => sum + w.openRequests, 0);
  const overview = [
    {
      icon: Building2,
      label: vocab.plural.charAt(0).toUpperCase() + vocab.plural.slice(1),
      value: liveSpaces,
      hint: "actifs",
    },
    {
      icon: Link2,
      label: "Portails partagés",
      value: sharedPortals,
      hint: "liens sécurisés ouverts",
    },
    {
      icon: Clock,
      label: "Décisions en attente",
      value: pendingDecisions,
      hint: "documents à valider côté client",
      emphasize: pendingDecisions > 0,
    },
    {
      icon: Inbox,
      label: "Pièces attendues",
      value: openRequests,
      hint: "à recevoir ou à valider",
      emphasize: openRequests > 0,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* En-tête — sobre, une seule action */}
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {firstName ? `Bonjour ${firstName},` : "Bonjour,"}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {vocab.listTitle}
          </h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/workspaces/new">
            <Plus className="h-4 w-4" />
            {vocab.newLabel}
          </Link>
        </Button>
      </header>

      {workspaces.length > 0 && (
        <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <span
                  className={
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
                    (item.emphasize
                      ? "bg-warning/10 text-warning"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold tabular-nums">
                      {item.value}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {item.label}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.hint}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {workspaces.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={FolderClosed}
              title="Créez votre premier espace"
              description="Déposez vos documents, organisez-les en dossiers, et partagez-les en interne ou avec vos clients — en toute sécurité."
              action={
                <Button asChild>
                  <Link href="/dashboard/workspaces/new">
                    <Plus className="h-4 w-4" />
                    {vocab.newLabel}
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <WorkspacesList workspaces={workspaces} usageType={usageType} />
        )}
      </div>
    </div>
  );
}
