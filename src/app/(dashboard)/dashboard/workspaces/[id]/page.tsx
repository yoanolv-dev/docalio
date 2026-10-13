import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Explorer } from "@/components/drive/explorer";
import { SpaceHeader } from "@/components/spaces/space-header";
import { getDriveListing } from "@/lib/drive";
import { getCurrentMembership, isAdmin } from "@/lib/organizations";
import { getActiveShareLink } from "@/lib/share-links";
import { getWorkspaceActivity } from "@/lib/activity";
import { listWorkspaceRequests } from "@/lib/requests";
import { listGroupsWithMembers, listWorkspaceAccess } from "@/lib/access";
import { listOrgMembers } from "@/lib/team";
import { createClient } from "@/lib/supabase/server";
import type { AccessLevel } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Espace",
};

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dossier?: string; apercu?: string; nouveau?: string }>;
}) {
  const [{ id }, { dossier, apercu, nouveau }] = await Promise.all([params, searchParams]);
  const [membership, listing, headerList] = await Promise.all([
    getCurrentMembership(),
    getDriveListing(id, dossier ?? null),
    headers(),
  ]);
  if (!listing || !membership) notFound();

  const { workspace } = listing;
  const org = membership.organization;
  const guest = membership.role === "guest";
  const clientSpace = workspace.space_type === "external";

  // Invité : son niveau d'accès sur cet espace.
  let guestLevel: AccessLevel | null = null;
  if (guest) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("workspace_access")
      .select("access_level")
      .eq("workspace_id", workspace.id)
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle<{ access_level: AccessLevel }>();
    guestLevel = data?.access_level ?? "viewer";
  }

  // Portail client (espaces partagés avec un client), réservé aux membres.
  let portal = null;
  if (clientSpace && !guest) {
    const [link, requests, activity] = await Promise.all([
      getActiveShareLink(workspace.id),
      listWorkspaceRequests(workspace.id),
      getWorkspaceActivity(workspace.id),
    ]);
    if (link || requests.length || workspace.client_email || workspace.client_company) {
      portal = { link, requests, activity };
    }
  }

  // Accès des membres de l'équipe (espaces privés), hors invités extérieurs.
  let access = null;
  if (workspace.space_type === "internal" && !guest) {
    const [entries, groups, members] = await Promise.all([
      listWorkspaceAccess(workspace.id),
      listGroupsWithMembers(org.id),
      listOrgMembers(org.id),
    ]);
    const guestIds = new Set(members.filter((m) => m.role === "guest").map((m) => m.user_id));
    access = {
      entries: entries.filter((e) => !e.user || !guestIds.has(e.user.id)),
      groups,
      members: members.filter((m) => m.role !== "guest"),
      canManage: isAdmin(membership),
    };
  }

  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  return (
    <div className="space-y-4">
      <SpaceHeader
        workspace={workspace}
        org={org}
        guestLevel={guestLevel}
        canWrite={listing.canWrite && !guest}
        baseUrl={`${proto}://${host}`}
        justCreated={nouveau === "1"}
        portal={portal}
        access={access}
      />
      <Explorer
        key={workspace.id}
        listing={listing}
        clientSpace={clientSpace && portal !== null}
        canShare={!guest && listing.canWrite}
        initialPreviewId={apercu ?? null}
      />
    </div>
  );
}
