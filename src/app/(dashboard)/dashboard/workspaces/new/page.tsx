import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { createWorkspaceAction } from "@/lib/actions/workspaces";
import { getCurrentMembership } from "@/lib/organizations";
import { getOrganizationUsage } from "@/lib/usage";
import { isLimitReached, resolvePlan } from "@/lib/plans";
import { vocabularyFor } from "@/lib/sectors";

export const metadata: Metadata = {
  title: "Nouvel espace",
};

export default async function NewWorkspacePage() {
  const membership = await getCurrentMembership();
  const plan = resolvePlan(membership?.organization);
  const activeLimit = plan.limits.activeWorkspaces;
  const usageType = membership?.organization.usage_type ?? "external";
  const vocab = vocabularyFor(usageType);

  let activeLimitReached = false;
  if (membership && activeLimit !== null) {
    const usage = await getOrganizationUsage(membership.organization.id);
    activeLimitReached = isLimitReached(usage.activeWorkspaces, activeLimit);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title={vocab.createTitle}
        description="Déposez vos documents, organisez-les en dossiers, partagez si besoin."
        backHref="/dashboard/workspaces"
        backLabel={vocab.listTitle}
      />

      {activeLimitReached && (
        <div className="flex max-w-2xl items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Vous avez atteint la limite de {activeLimit} {vocab.plural} actifs
            de votre plan {plan.name}. Vous pouvez créer cet espace en
            «&nbsp;Prospect&nbsp;», mais pour l&apos;activer, archivez
            d&apos;abord un espace actif ou passez à un plan supérieur.
          </p>
        </div>
      )}

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <WorkspaceForm
            action={createWorkspaceAction}
            submitLabel="Créer l'espace"
            usageType={usageType}
            sector={membership?.organization.sector}
          />
        </CardContent>
      </Card>
    </div>
  );
}
