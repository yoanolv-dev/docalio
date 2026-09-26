import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/organizations";
import { listWorkspacesWithMeta } from "@/lib/workspaces";
import { getActionItems } from "@/lib/action-items";
import { SpacesView } from "@/components/spaces/spaces-view";
import { getSector, vocabularyFor } from "@/lib/sectors";

export const metadata: Metadata = { title: "Espaces" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { nouveau } = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const org = membership.organization;
  const [workspaces, actions] = await Promise.all([
    listWorkspacesWithMeta(),
    getActionItems(8),
  ]);
  const sector = getSector(org.sector);

  return (
    <SpacesView
      workspaces={workspaces}
      actions={actions}
      vocab={vocabularyFor(org.usage_type)}
      template={sector.requestTemplate}
      nameExample={sector.nameExample}
      internal={org.usage_type === "internal"}
      canCreateInternal={org.usage_type === "mixed"}
      openCreate={nouveau === "1"}
    />
  );
}
