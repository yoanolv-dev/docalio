import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderClosed, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { listWorkspacesWithMeta } from "@/lib/workspaces";
import { getOnboardingProgress } from "@/lib/onboarding";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Espaces clients",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const [workspaces, onboarding] = await Promise.all([
    listWorkspacesWithMeta(),
    getOnboardingProgress(),
  ]);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ?? null;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* En-tête — sobre, une seule action */}
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {firstName ? `Bonjour ${firstName},` : "Bonjour,"}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            Vos espaces clients
          </h1>
        </div>
        <Button asChild>
          <Link href="/dashboard/workspaces/new">
            <Plus className="h-4 w-4" />
            Nouvel espace
          </Link>
        </Button>
      </header>

      {!onboarding.done && (
        <div className="shrink-0">
          <OnboardingChecklist progress={onboarding} />
        </div>
      )}

      <div className="min-h-0 flex-1">
        {workspaces.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={FolderClosed}
              title="Créez votre premier espace"
              description="Un espace par client : déposez les documents, partagez un lien sécurisé, suivez les consultations et les décisions."
              action={
                <Button asChild>
                  <Link href="/dashboard/workspaces/new">
                    <Plus className="h-4 w-4" />
                    Créer un espace
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <WorkspacesList workspaces={workspaces} />
        )}
      </div>
    </div>
  );
}
