import { Eye, Download, FileText, Clock, Activity } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/types/database";
import type { WorkspaceActivity } from "@/lib/activity";

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function WorkspaceEngagementStats({
  activity,
}: {
  activity: WorkspaceActivity;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile
        label="Ouvertures"
        value={activity.totalOpens}
        hint={
          activity.lastOpenAt
            ? formatRelativeTime(activity.lastOpenAt)
            : "Jamais ouvert"
        }
      />
      <StatTile
        label="Téléchargements"
        value={activity.totalDownloads}
        hint={
          activity.lastDownloadAt
            ? formatRelativeTime(activity.lastDownloadAt)
            : "Aucun"
        }
      />
      <StatTile
        label="Docs téléchargés"
        value={activity.documentsDownloaded}
      />
    </div>
  );
}

const EVENT_META: Record<
  ActivityEvent["event_type"],
  { icon: typeof Eye; tone: string }
> = {
  portal_opened: { icon: Eye, tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" },
  document_downloaded: { icon: Download, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  document_opened: { icon: FileText, tone: "bg-muted text-muted-foreground" },
};

function eventLabel(event: ActivityEvent): string {
  switch (event.event_type) {
    case "portal_opened":
      return "Portail ouvert";
    case "document_downloaded":
      return event.document_title
        ? `Document téléchargé : ${event.document_title}`
        : "Document téléchargé";
    case "document_opened":
      return event.document_title
        ? `Document ouvert : ${event.document_title}`
        : "Document ouvert";
    default:
      return "Activité";
  }
}

export function WorkspaceActivityTimeline({
  timeline,
}: {
  timeline: ActivityEvent[];
}) {
  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Aucune activité pour l'instant"
        description="Dès que votre client ouvrira le portail ou téléchargera un document, l'activité apparaîtra ici."
      />
    );
  }

  return (
    <ul className="space-y-1">
      {timeline.map((event) => {
        const meta = EVENT_META[event.event_type] ?? EVENT_META.document_opened;
        const Icon = meta.icon;
        return (
          <li key={event.id} className="flex items-center gap-3 py-1.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{eventLabel(event)}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(event.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
