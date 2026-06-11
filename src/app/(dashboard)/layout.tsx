import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileTopbar } from "@/components/layout/mobile-topbar";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

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

  const roleLabel = ROLE_LABELS[membership.role] ?? membership.role;
  const userName =
    (user.user_metadata?.full_name as string | undefined) ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        orgName={membership.organization.name}
        roleLabel={roleLabel}
        userName={userName}
        userEmail={user.email ?? ""}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTopbar
          orgName={membership.organization.name}
          roleLabel={roleLabel}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
