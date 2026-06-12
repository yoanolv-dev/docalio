"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { NotificationRow } from "@/components/notifications/notification-row";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/types/database";

export function NotificationBell({
  unreadCount,
  recent,
}: {
  unreadCount: number;
  recent: AppNotification[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur + Échap.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasUnread = unreadCount > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          hasUnread
            ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
            : "Notifications"
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" />
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="animate-fade-up absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {hasUnread && (
              <form action={markAllNotificationsReadAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout marquer comme lu
                </button>
              </form>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto p-1.5">
            {recent.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <Bell className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">Aucune notification</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  L&apos;activité de vos clients apparaîtra ici.
                </p>
              </div>
            ) : (
              recent.map((n) => (
                <NotificationRow key={n.id} notification={n} compact />
              ))
            )}
          </div>

          <div className="border-t border-border p-1.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-muted"
              )}
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
