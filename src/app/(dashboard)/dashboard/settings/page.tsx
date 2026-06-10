import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { getCurrentMembership } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const canEdit = membership.role === "owner" || membership.role === "admin";

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Paramètres de l'organisation"
        description="Gérez l'identité et les informations de votre organisation."
      />

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
    </div>
  );
}
