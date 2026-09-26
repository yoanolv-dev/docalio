import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import { TopBar } from "@/components/layout/top-bar";
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

  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadNotificationCount(),
    getRecentNotifications(8),
  ]);

  const org = membership.organization;
  const vocab = vocabularyFor(org.usage_type);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-canvas">
      <TopBar
        orgName={org.name}
        orgLogoUrl={org.logo_url}
        orgColor={org.primary_color}
        spacesLabel={vocab.plural.charAt(0).toUpperCase() + vocab.plural.slice(1)}
        userName={(user.user_metadata?.full_name as string | undefined) ?? null}
        userEmail={user.email ?? ""}
        unreadCount={unreadCount}
        recentNotifications={recentNotifications}
      />
      <main className="min-h-0 w-full flex-1 overflow-y-auto scroll-smooth">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
