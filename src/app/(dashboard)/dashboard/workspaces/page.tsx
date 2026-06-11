import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { listWorkspaces } from "@/lib/workspaces";

export const metadata: Metadata = {
  title: "Espaces clients",
};

export default async function WorkspacesPage() {
  const workspaces = await listWorkspaces();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espaces clients"
        description="Gérez vos espaces clients, prospects et projets."
        actions={
          <Button size="sm" asChild>
            <Link href="/dashboard/workspaces/new">
              <Plus className="h-4 w-4" />
              Créer un espace
            </Link>
          </Button>
        }
      />

      {workspaces.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun espace client pour le moment"
          description="Créez votre premier espace pour centraliser les informations d'un client ou d'un prospect."
          action={
            <Button size="sm" asChild>
              <Link href="/dashboard/workspaces/new">
                <Plus className="h-4 w-4" />
                Créer un espace
              </Link>
            </Button>
          }
        />
      ) : (
        <WorkspacesList workspaces={workspaces} />
      )}
    </div>
  );
}
