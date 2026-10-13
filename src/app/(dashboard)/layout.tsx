import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, listMemberships } from "@/lib/organizations";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications";
import { listNavSpaces } from "@/lib/drive";
import { getOrganizationUsage } from "@/lib/usage";
import { resolvePlan } from "@/lib/plans";
import { getSector } from "@/lib/sectors";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { UploadProvider } from "@/components/drive/upload-provider";
import { MfaRequired } from "@/components/settings/mfa-required";

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

  const org = membership.organization;
  const guest = membership.role === "guest";

  // 2FA exigée par l'organisation : tant que le membre ne l'a pas activée,
  // seul l'écran d'activation s'affiche (aucune donnée n'est chargée).
  if (org.require_mfa && !guest) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = (factors?.totp ?? []).some((f) => f.status === "verified");
    if (!verified) {
      return (
        <ToastProvider>
          <MfaRequired orgName={org.name} />
        </ToastProvider>
      );
    }
  }

  const [unreadCount, recentNotifications, spaces, memberships, usage] = await Promise.all([
    guest ? Promise.resolve(0) : getUnreadNotificationCount(),
    guest ? Promise.resolve([]) : getRecentNotifications(8),
    listNavSpaces(org.id),
    listMemberships(),
    guest ? Promise.resolve(null) : getOrganizationUsage(org.id),
  ]);

  const sector = getSector(org.sector);
  const plan = resolvePlan(org);

  return (
    <ToastProvider>
      <UploadProvider>
        <AppShell
          org={{ id: org.id, name: org.name, logo_url: org.logo_url, primary_color: org.primary_color }}
          guest={guest}
          user={{
            name: (user.user_metadata?.full_name as string | undefined) ?? null,
            email: user.email ?? "",
          }}
          spaces={spaces}
          storage={usage ? { used: usage.storageUsed, limit: plan.limits.storageBytes } : null}
          unreadCount={unreadCount}
          recentNotifications={recentNotifications}
          memberships={memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            guest: m.role === "guest",
          }))}
          newSpace={{
            template: sector.requestTemplate,
            nameExample: sector.nameExample,
            clientByDefault: org.usage_type === "external",
          }}
        >
          {children}
        </AppShell>
      </UploadProvider>
    </ToastProvider>
  );
}
