import Link from "next/link";
import { ChevronRight, CircleX, Inbox, PencilLine, TriangleAlert, PartyPopper } from "lucide-react";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import type { ActionItem, ActionKind } from "@/lib/action-items";

const META: Record<ActionKind, { icon: typeof Inbox; tone: string; label: string; cta: string }> = {
  request_to_review: { icon: Inbox, tone: "bg-violet-50 text-violet-600", label: "Pièce à valider", cta: "Valider" },
  decision_changes: { icon: PencilLine, tone: "bg-amber-50 text-amber-600", label: "Modification demandée", cta: "Voir" },
  decision_rejected: { icon: CircleX, tone: "bg-red-50 text-red-600", label: "Document refusé", cta: "Voir" },
  request_overdue: { icon: TriangleAlert, tone: "bg-orange-50 text-orange-600", label: "Pièce en retard", cta: "Relancer" },
};

export function ActionList({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <PartyPopper className="h-5 w-5" />
        </span>
        <p className="mt-4 text-sm font-semibold">Rien à traiter pour l&apos;instant</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Les pièces déposées, les demandes de modification et les retards
          apparaîtront ici dès qu&apos;un client agit.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const m = META[item.kind];
        const Icon = m.icon;
        return (
          <li key={item.id}>
            <Link
              href={`/dashboard/workspaces/${item.workspaceId}${item.kind.startsWith("request") ? "?tab=pieces" : "?tab=documents"}`}
              className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-canvas/70"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", m.tone)}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {m.label} · {item.workspaceName}
                  {item.kind === "request_overdue"
                    ? ` · échéance ${formatDate(item.at)}`
                    : ` · ${formatRelativeTime(item.at)}`}
                  {item.detail ? ` · « ${item.detail} »` : ""}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-0.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:inline-flex">
                {m.cta}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
