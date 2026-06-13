import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, CreditCard, Users } from "lucide-react";
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

const SECTION_NAV = [
  { href: "#abonnement", label: "Abonnement", icon: CreditCard },
  { href: "#equipe", label: "Équipe", icon: Users },
  { href: "#identite", label: "Identité", icon: Building2 },
];

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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Paramètres de l&apos;organisation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez votre abonnement, votre équipe et l&apos;identité de votre
          organisation.
        </p>
      </header>

      {/* Navigation par section — accès direct aux fonctionnalités clés */}
      <nav className="sticky top-0 z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-border bg-background/85 px-1 py-1 backdrop-blur">
        {SECTION_NAV.map((s) => {
          const Icon = s.icon;
          return (
            <a
              key={s.href}
              href={s.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </a>
          );
        })}
      </nav>

      {/* Abonnement & usage */}
      <section id="abonnement" className="scroll-mt-16 space-y-4">
        <PlanUsageCard organization={membership.organization} usage={usage} />
        <PlansOverview currentPlan={currentPlan} />
      </section>

      {/* Équipe — collaboration à plusieurs */}
      <section id="equipe" className="scroll-mt-16">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle>Équipe &amp; accès</CardTitle>
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

      {/* Identité de l'organisation */}
      <section id="identite" className="scroll-mt-16">
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
      </section>
    </div>
  );
}
