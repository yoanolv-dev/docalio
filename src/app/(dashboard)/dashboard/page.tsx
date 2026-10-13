import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/organizations";
import { listRecentFiles, listSpaceCards } from "@/lib/drive";
import { getActionItems } from "@/lib/action-items";
import { getSector } from "@/lib/sectors";
import { createClient } from "@/lib/supabase/server";
import { DriveHome } from "@/components/drive/drive-home";

export const metadata: Metadata = { title: "Drive" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { nouveau } = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const org = membership.organization;
  const guest = membership.role === "guest";
  const supabase = await createClient();

  const [spaces, recent, actions, { data: auth }] = await Promise.all([
    listSpaceCards(org.id),
    listRecentFiles(org.id, 8),
    guest ? Promise.resolve([]) : getActionItems(6),
    supabase.auth.getUser(),
  ]);

  // Un invité qui n'a accès qu'à un seul espace y arrive directement.
  const activeSpaces = spaces.filter((s) => s.status !== "archived");
  if (guest && activeSpaces.length === 1) {
    redirect(`/dashboard/workspaces/${activeSpaces[0].id}`);
  }

  const fullName = (auth.user?.user_metadata?.full_name as string | undefined) ?? null;
  const sector = getSector(org.sector);

  return (
    <DriveHome
      firstName={fullName?.split(" ")[0] ?? null}
      guest={guest}
      spaces={spaces}
      recent={recent}
      actions={actions}
      newSpace={{
        template: sector.requestTemplate,
        nameExample: sector.nameExample,
        clientByDefault: org.usage_type === "external",
      }}
      openCreate={nouveau === "1"}
    />
  );
}
