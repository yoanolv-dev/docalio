import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { createWorkspaceAction } from "@/lib/actions/workspaces";

export const metadata: Metadata = {
  title: "Nouvel espace client",
};

export default function NewWorkspacePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/dashboard/workspaces"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Espaces clients
        </Link>
        <DashboardHeader
          title="Créer un espace client"
          description="Renseignez les informations de votre client ou prospect."
        />
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <WorkspaceForm
            action={createWorkspaceAction}
            submitLabel="Créer l'espace"
          />
        </CardContent>
      </Card>
    </div>
  );
}
