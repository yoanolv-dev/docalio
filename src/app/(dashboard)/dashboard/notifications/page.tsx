import type { Metadata } from "next";
import { Bell, Check, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationRow } from "@/components/notifications/notification-row";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications";
import { listNotifications } from "@/lib/notifications";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const notifications = await listNotifications(100);
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="L'activité de vos clients : ouvertures, téléchargements et décisions."
        actions={
          hasUnread ? (
            <form action={markAllNotificationsReadAction}>
              <Button type="submit" variant="outline" size="sm">
                <CheckCheck className="h-4 w-4" />
                Tout marquer comme lu
              </Button>
            </form>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification pour le moment"
          description="Dès que vos clients ouvriront un portail, téléchargeront un document ou prendront une décision, vous serez informé ici."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-1 px-1.5 py-0.5">
                <div className="min-w-0 flex-1">
                  <NotificationRow notification={n} />
                </div>
                {!n.read_at && (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={n.id} />
                    <button
                      type="submit"
                      title="Marquer comme lue"
                      aria-label="Marquer comme lue"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
