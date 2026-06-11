import Link from "next/link";
import { FileText } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getInitials } from "@/lib/utils";

interface SidebarProps {
  orgName: string;
  roleLabel: string;
  userName: string | null;
  userEmail: string;
}

export function Sidebar({ orgName, roleLabel, userName, userEmail }: SidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      {/* Marque */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Docalio</span>
        </Link>
      </div>

      {/* Organisation active */}
      <div className="border-b border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-xs font-semibold text-primary">
            {getInitials(orgName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{orgName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-3">
        <NavLinks />
      </div>

      {/* Utilisateur */}
      <div className="space-y-2 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {getInitials(userName ?? userEmail)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {userName ?? "Utilisateur"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
