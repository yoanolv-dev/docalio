import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { createWorkspaceAction } from "@/lib/actions/workspaces";

export const metadata: Metadata = {
  title: "Nouvel espace client",
};

export default function NewWorkspacePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Créer un espace client"
        description="Renseignez les informations de votre client ou prospect."
        backHref="/dashboard/workspaces"
        backLabel="Espaces clients"
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <WorkspaceForm
            action={createWorkspaceAction}
            submitLabel="Créer l'espace"
          />
        </CardContent>
      </Card>
    </div>
  );
}
