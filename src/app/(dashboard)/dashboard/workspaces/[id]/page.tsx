import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { WorkspaceView } from "@/components/workspaces/workspace-view";
import { getWorkspace } from "@/lib/workspaces";
import { listWorkspaceDocuments } from "@/lib/documents";
import { listWorkspaceFolders } from "@/lib/folders";
import { getActiveShareLink } from "@/lib/share-links";
import { getWorkspaceActivity } from "@/lib/activity";
import { getWorkspaceDecisions } from "@/lib/decisions";
import { listWorkspaceRequests } from "@/lib/requests";
import { getCurrentMembership } from "@/lib/organizations";
import {
  listWorkspaceAccess,
  listGroupsWithMembers,
  type WorkspaceAccessEntry,
  type GroupWithMembers,
} from "@/lib/access";
import { listOrgMembers, type OrgMember } from "@/lib/team";

export const metadata: Metadata = {
  title: "Espace client",
};

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  const [documents, folders, shareLink, activity, decisions, headerList, membership, requests] =
    await Promise.all([
      listWorkspaceDocuments(workspace.id),
      listWorkspaceFolders(workspace.id),
      getActiveShareLink(workspace.id),
      getWorkspaceActivity(workspace.id),
      getWorkspaceDecisions(workspace.id),
      headers(),
      getCurrentMembership(),
      listWorkspaceRequests(workspace.id),
    ]);

  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  // Accès interne (espaces internes uniquement) : groupes, membres, grants.
  let spaceAccess: WorkspaceAccessEntry[] = [];
  let accessGroups: GroupWithMembers[] = [];
  let accessMembers: OrgMember[] = [];
  if (workspace.space_type === "internal" && membership) {
    [spaceAccess, accessGroups, accessMembers] = await Promise.all([
      listWorkspaceAccess(workspace.id),
      listGroupsWithMembers(membership.organization.id),
      listOrgMembers(membership.organization.id),
    ]);
  }

  return (
    <WorkspaceView
      workspace={workspace}
      documents={documents}
      folders={folders}
      shareLink={shareLink}
      activity={activity}
      decisions={decisions}
      requests={requests}
      org={membership?.organization}
      baseUrl={`${proto}://${host}`}
      tab={tab}
      spaceAccess={spaceAccess}
      accessGroups={accessGroups}
      accessMembers={accessMembers}
      canManageAccess={membership ? membership.role !== "member" : false}
    />
  );
}
