import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlanUsageCard } from "@/components/settings/plan-usage-card";
import { PlansOverview } from "@/components/settings/plans-overview";
import { getCurrentMembership } from "@/lib/organizations";
import { getOrganizationUsage } from "@/lib/usage";
import { resolvePlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Abonnement",
};

export default async function BillingSettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const usage = await getOrganizationUsage(membership.organization.id);
  const currentPlan = resolvePlan(membership.organization).id;

  return (
    <div className="space-y-4">
      <PlanUsageCard organization={membership.organization} usage={usage} />
      <PlansOverview currentPlan={currentPlan} />
    </div>
  );
}
