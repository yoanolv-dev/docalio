"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, Search, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { AccountMenu } from "@/components/layout/account-menu";
import { AppSidebar, type SidebarProps } from "@/components/layout/app-sidebar";
import type { AppNotification } from "@/lib/types/database";

/**
 * Barre supérieure du dashboard : recherche globale (Ctrl K), activité et
 * compte. La navigation vit dans le menu latéral (tiroir sur mobile).
 */
export function TopBar({
  userName,
  userEmail,
  unreadCount,
  recentNotifications,
  sidebar,
}: {
  userName: string | null;
  userEmail: string;
  unreadCount: number;
  recentNotifications: AppNotification[];
  sidebar: SidebarProps;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  return (
    <>
      <header className="z-40 shrink-0 border-b border-border/80 bg-white/80 backdrop-blur-md">
        <div className="flex h-14 w-full items-center gap-2 px-3 sm:px-5">
          {/* Mobile : tiroir de navigation */}
          <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                aria-label="Ouvrir la navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] lg:hidden" />
              <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-border bg-[var(--sidebar)] shadow-2xl outline-none lg:hidden">
                <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label="Fermer la navigation"
                  className="absolute right-3 top-3.5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
                <AppSidebar {...sidebar} onNavigate={() => setDrawerOpen(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          <LogoMark className="h-7 w-7 lg:hidden" />

          {/* Recherche globale */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group ml-1 flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-border bg-canvas/70 px-3 text-sm text-muted-foreground transition-colors hover:border-ring/40 hover:bg-white hover:text-foreground sm:max-w-md lg:ml-0"
            aria-label="Rechercher et naviguer"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Rechercher un espace, une action…</span>
            <kbd className="ml-auto hidden rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell unreadCount={unreadCount} recent={recentNotifications} />
            <AccountMenu userName={userName} userEmail={userEmail} orgName={sidebar.orgName} />
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
