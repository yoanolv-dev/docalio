import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { listWorkspacesWithMeta } from "@/lib/workspaces";
import { getActionItems } from "@/lib/action-items";
import { getRecentNotifications } from "@/lib/notifications";
import { HomeView } from "@/components/home/home-view";

export const metadata: Metadata = { title: "Accueil" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const [workspaces, actions, recent] = await Promise.all([
    listWorkspacesWithMeta(),
    getActionItems(10),
    getRecentNotifications(6),
  ]);

  return (
    <HomeView
      firstName={user?.user_metadata?.full_name?.split(" ")[0] ?? null}
      usageType={membership.organization.usage_type}
      workspaces={workspaces}
      actions={actions}
      recent={recent}
    />
  );
}
