"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Menu, X } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { AppNotification } from "@/lib/types/database";

export function MobileTopbar({
  orgName,
  roleLabel,
  unreadCount,
  recentNotifications,
}: {
  orgName: string;
  roleLabel: string;
  unreadCount: number;
  recentNotifications: AppNotification[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Docalio</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell
            unreadCount={unreadCount}
            recent={recentNotifications}
          />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div className="px-2.5">
            <p className="text-sm font-medium">{orgName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="border-t border-border pt-3">
            <SignOutButton />
          </div>
        </div>
      )}
    </header>
  );
}
