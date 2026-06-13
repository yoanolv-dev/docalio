"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { AccountMenu } from "@/components/layout/account-menu";
import type { AppNotification } from "@/lib/types/database";

/**
 * Barre supérieure unique du dashboard. Pas de sidebar : la navigation passe
 * par la palette de commandes (Ctrl K), volontairement épurée.
 */
export function TopBar({
  orgName,
  userName,
  userEmail,
  unreadCount,
  recentNotifications,
}: {
  orgName: string;
  userName: string | null;
  userEmail: string;
  unreadCount: number;
  recentNotifications: AppNotification[];
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <header className="z-40 shrink-0 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-14 w-full items-center gap-3 px-3 sm:px-5">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Docalio</span>
          </Link>

          <span className="hidden h-5 w-px bg-border sm:block" />
          <span className="hidden min-w-0 truncate text-sm font-medium text-muted-foreground sm:block">
            {orgName}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
              aria-label="Rechercher et naviguer"
            >
              <Search className="h-4 w-4" />
              <span className="hidden lg:inline">Rechercher…</span>
              <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium lg:inline">
                Ctrl K
              </kbd>
            </button>

            <NotificationBell unreadCount={unreadCount} recent={recentNotifications} />

            <AccountMenu
              userName={userName}
              userEmail={userEmail}
              orgName={orgName}
            />
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
