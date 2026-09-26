"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { AccountMenu } from "@/components/layout/account-menu";
import { cn, getInitials } from "@/lib/utils";
import type { AppNotification } from "@/lib/types/database";

export interface TopBarProps {
  orgName: string;
  orgLogoUrl: string | null;
  orgColor: string | null;
  spacesLabel: string;
  userName: string | null;
  userEmail: string;
  unreadCount: number;
  recentNotifications: AppNotification[];
}

/**
 * Barre unique de l'application : deux destinations (Espaces, Réglages), la
 * recherche (Ctrl K), l'activité et le compte. Rien d'autre à apprendre.
 */
export function TopBar({
  orgName,
  orgLogoUrl,
  orgColor,
  spacesLabel,
  userName,
  userEmail,
  unreadCount,
  recentNotifications,
}: TopBarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();

  const nav = [
    {
      href: "/dashboard",
      label: spacesLabel,
      active: pathname === "/dashboard" || pathname.startsWith("/dashboard/workspaces"),
    },
    {
      href: "/dashboard/settings/organisation",
      label: "Réglages",
      active: pathname.startsWith("/dashboard/settings"),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 border-b border-border/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="Accueil">
            {orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgLogoUrl} alt="" className="h-7 w-7 rounded-lg object-cover ring-1 ring-black/5" />
            ) : orgColor ? (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold text-white"
                style={{ backgroundColor: orgColor }}
              >
                {getInitials(orgName)}
              </span>
            ) : (
              <LogoMark className="h-7 w-7" />
            )}
            <span className="hidden max-w-[180px] truncate text-sm font-semibold sm:block">{orgName}</span>
          </Link>

          <nav aria-label="Navigation principale" className="ml-2 flex items-center gap-0.5 sm:ml-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-canvas text-foreground ring-1 ring-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Rechercher (Ctrl K)"
              title="Rechercher (Ctrl K)"
              className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-canvas hover:text-foreground"
            >
              <Search className="h-[18px] w-[18px]" />
              <kbd className="hidden rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium md:inline">
                Ctrl K
              </kbd>
            </button>
            <NotificationBell unreadCount={unreadCount} recent={recentNotifications} />
            <AccountMenu userName={userName} userEmail={userEmail} orgName={orgName} />
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
