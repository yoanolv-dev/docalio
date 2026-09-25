import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import { TopBar } from "@/components/layout/top-bar";
import { AppSidebar, type SidebarProps } from "@/components/layout/app-sidebar";
import { PLANS, PLAN_ORDER, resolvePlan } from "@/lib/plans";
import { vocabularyFor } from "@/lib/sectors";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pas encore d'organisation → onboarding obligatoire.
  const membership = await getCurrentMembership();
  if (!membership) {
    redirect("/onboarding");
  }

  const userName =
    (user.user_metadata?.full_name as string | undefined) ?? null;

  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadNotificationCount(),
    getRecentNotifications(8),
  ]);

  const org = membership.organization;
  const plan = resolvePlan(org);
  // Forfait supérieur « naturel » (hors Entreprise, sur devis).
  const nextId = PLAN_ORDER[PLAN_ORDER.indexOf(plan.id) + 1];
  const upgradeTo = nextId && nextId !== "enterprise" ? PLANS[nextId].name : null;
  const vocab = vocabularyFor(org.usage_type);
  const spacesLabel = vocab.plural.charAt(0).toUpperCase() + vocab.plural.slice(1);

  const sidebar: SidebarProps = {
    orgName: org.name,
    orgLogoUrl: org.logo_url,
    orgColor: org.primary_color,
    planName: plan.name,
    upgradeTo,
    unreadCount,
    newSpaceLabel: vocab.newLabel,
    spacesLabel,
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      <aside className="hidden w-[248px] shrink-0 border-r border-border/80 bg-[var(--sidebar)] lg:block">
        <AppSidebar {...sidebar} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          userName={userName}
          userEmail={user.email ?? ""}
          unreadCount={unreadCount}
          recentNotifications={recentNotifications}
          sidebar={sidebar}
        />
        <main className="min-h-0 w-full flex-1 overflow-y-auto scroll-smooth px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
