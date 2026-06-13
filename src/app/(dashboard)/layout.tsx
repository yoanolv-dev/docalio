import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import { TopBar } from "@/components/layout/top-bar";

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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <TopBar
        orgName={membership.organization.name}
        userName={userName}
        userEmail={user.email ?? ""}
        unreadCount={unreadCount}
        recentNotifications={recentNotifications}
      />
      <main className="min-h-0 w-full flex-1 scroll-smooth overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
        {children}
      </main>
    </div>
  );
}
