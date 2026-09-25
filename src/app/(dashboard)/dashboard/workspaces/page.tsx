import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderClosed, Plus } from "lucide-react";
import { getCurrentMembership } from "@/lib/organizations";
import { listWorkspacesWithMeta } from "@/lib/workspaces";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { vocabularyFor } from "@/lib/sectors";

export const metadata: Metadata = { title: "Espaces" };

export default async function WorkspacesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const workspaces = await listWorkspacesWithMeta();
  const usageType = membership.organization.usage_type;
  const vocab = vocabularyFor(usageType);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title={vocab.listTitle}
        description={`${workspaces.length} ${workspaces.length > 1 ? vocab.plural : vocab.singular} · recherchez, filtrez et ouvrez un dossier.`}
        actions={
          <Button asChild>
            <Link href="/dashboard/workspaces/new">
              <Plus className="h-4 w-4" />
              {vocab.newLabel}
            </Link>
          </Button>
        }
      />
      {workspaces.length === 0 ? (
        <EmptyState
          icon={FolderClosed}
          title="Créez votre premier espace client"
          description="Un espace par client : vous y demandez ses pièces, partagez vos documents et suivez ses validations."
          action={
            <Button asChild>
              <Link href="/dashboard/workspaces/new">
                <Plus className="h-4 w-4" />
                {vocab.newLabel}
              </Link>
            </Button>
          }
        />
      ) : (
        <WorkspacesList workspaces={workspaces} usageType={usageType} />
      )}
    </div>
  );
}
