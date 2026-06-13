import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FolderLock, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamManager } from "@/components/settings/team-manager";
import { GroupsManager } from "@/components/settings/groups-manager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { listOrgMembers, listPendingInvites } from "@/lib/team";
import { listGroupsWithMembers } from "@/lib/access";

export const metadata: Metadata = {
  title: "Équipe & accès",
};

export default async function TeamSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const canEdit = membership.role === "owner" || membership.role === "admin";
  const [members, invites, groups] = await Promise.all([
    listOrgMembers(membership.organization.id),
    canEdit
      ? listPendingInvites(membership.organization.id)
      : Promise.resolve([]),
    listGroupsWithMembers(membership.organization.id),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle>Équipe</CardTitle>
          </div>
          <CardDescription>
            Invitez vos collègues à collaborer et gérez leurs rôles
            (propriétaire, admin, membre).
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderLock className="h-4 w-4 text-primary" />
            <CardTitle>Groupes &amp; accès</CardTitle>
          </div>
          <CardDescription>
            Créez des groupes d&apos;utilisateurs et autorisez-les, espace par
            espace, à accéder à vos espaces internes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupsManager groups={groups} members={members} canManage={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
