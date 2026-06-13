import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationSettingsForm } from "@/components/settings/organization-settings-form";
import { getCurrentMembership } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Identité",
};

export default async function OrganisationSettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const canEdit = membership.role === "owner" || membership.role === "admin";

  return (
    <div className="space-y-4">
      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle>Identité</CardTitle>
          </div>
          <CardDescription>
            Nom, logo et couleur — repris sur vos portails clients.
          </CardDescription>
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
