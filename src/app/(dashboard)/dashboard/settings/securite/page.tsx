import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaSetup } from "@/components/settings/mfa-setup";
import { RequireMfaToggle } from "@/components/settings/require-mfa-toggle";
import { getCurrentMembership, isAdmin } from "@/lib/organizations";

export const metadata: Metadata = { title: "Sécurité" };

export default async function SecuritySettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  return (
    <div className="space-y-4">
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle>Double authentification</CardTitle>
          </div>
          <CardDescription>
            Protégez votre compte avec un code à usage unique, en plus de votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaSetup />
        </CardContent>
      </Card>

      {isAdmin(membership) && (
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle>Politique de l&apos;organisation</CardTitle>
            </div>
            <CardDescription>
              Exigez la double authentification de tous les membres de l&apos;équipe. Ceux qui ne l&apos;ont pas
              activée devront le faire à leur prochaine visite. Les invités extérieurs ne sont pas concernés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">2FA obligatoire pour l&apos;équipe</p>
                <p className="text-xs text-muted-foreground">Activez-la d&apos;abord sur votre propre compte.</p>
              </div>
              <RequireMfaToggle initial={membership.organization.require_mfa} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
