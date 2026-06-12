import { openNotificationAction } from "@/lib/actions/notifications";
import {
  describeNotification,
  notificationHref,
} from "@/lib/notifications-format";
import { notificationVisual } from "@/components/notifications/notification-visual";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AppNotification } from "@/lib/types/database";

/**
 * Ligne de notification cliquable. Soumet un Server Action qui marque la
 * notification comme lue puis redirige vers le workspace concerné (fonctionne
 * sans JS). Réutilisée dans la cloche et la page Notifications.
 */
export function NotificationRow({
  notification,
  compact = false,
}: {
  notification: AppNotification;
  compact?: boolean;
}) {
  const { title, message } = describeNotification(notification);
  const { Icon, className } = notificationVisual(notification);
  const unread = !notification.read_at;

  return (
    <form action={openNotificationAction}>
      <input type="hidden" name="notification_id" value={notification.id} />
      <input type="hidden" name="href" value={notificationHref(notification)} />
      <button
        type="submit"
        className={cn(
          "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted",
          unread && "bg-primary-subtle/40"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            className
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{title}</span>
            {unread && (
              <span
                aria-label="Non lue"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              />
            )}
          </span>
          <span
            className={cn(
              "mt-0.5 block text-sm text-muted-foreground",
              compact ? "line-clamp-2" : ""
            )}
          >
            {message}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground/70">
            {formatRelativeTime(notification.created_at)}
          </span>
        </span>
      </button>
    </form>
  );
}
