import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { PlanUsageCard } from "@/components/settings/plan-usage-card";
import { PlansOverview } from "@/components/settings/plans-overview";
import { getCurrentMembership } from "@/lib/organizations";
import { getOrganizationUsage } from "@/lib/usage";
import { resolvePlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const canEdit = membership.role === "owner" || membership.role === "admin";
  const usage = await getOrganizationUsage(membership.organization.id);
  const currentPlan = resolvePlan(membership.organization).id;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <PageHeader
        title="Paramètres de l'organisation"
        description="Gérez votre abonnement, votre utilisation et l'identité de votre organisation."
      />

      <section className="space-y-4">
        <PlanUsageCard organization={membership.organization} usage={usage} />
        <PlansOverview currentPlan={currentPlan} />
      </section>

      <section className="space-y-4">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Identité</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationSettingsForm
              organization={membership.organization}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
