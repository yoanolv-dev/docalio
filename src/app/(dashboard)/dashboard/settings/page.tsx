import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { PlanUsageCard } from "@/components/settings/plan-usage-card";
import { PlansOverview } from "@/components/settings/plans-overview";
import { TeamManager } from "@/components/settings/team-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { getOrganizationUsage } from "@/lib/usage";
import { listOrgMembers, listPendingInvites } from "@/lib/team";
import { resolvePlan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const canEdit = membership.role === "owner" || membership.role === "admin";
  const [usage, members, invites] = await Promise.all([
    getOrganizationUsage(membership.organization.id),
    listOrgMembers(membership.organization.id),
    canEdit
      ? listPendingInvites(membership.organization.id)
      : Promise.resolve([]),
  ]);
  const currentPlan = resolvePlan(membership.organization).id;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <PageHeader
        title="Paramètres de l'organisation"
        description="Gérez votre équipe, votre abonnement et l'identité de votre organisation."
      />

      <section className="space-y-4">
        <PlanUsageCard organization={membership.organization} usage={usage} />
        <PlansOverview currentPlan={currentPlan} />
      </section>

      {/* Équipe — collaboration à plusieurs */}
      <section className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle>Équipe</CardTitle>
            </div>
            <CardDescription>
              Invitez vos collègues à collaborer sur les espaces clients et
              gérez leurs accès (propriétaire, admin, membre).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamManager
              members={members}
              invites={invites}
              currentUserId={user?.id ?? ""}
              canManage={canEdit}
            />
          </CardContent>
        </Card>
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
