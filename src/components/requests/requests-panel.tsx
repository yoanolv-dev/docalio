"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Download,
  Inbox,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createRequestsAction,
  deleteRequestAction,
  getRequestFileUrl,
  reviewRequestAction,
} from "@/lib/actions/requests";
import { cn, formatDate } from "@/lib/utils";
import type { DocumentRequest, RequestStatus } from "@/lib/types/database";

export const REQUEST_STATUS: Record<
  RequestStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "En attente",
    className: "bg-muted text-muted-foreground",
  },
  received: {
    label: "À valider",
    className:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
  validated: {
    label: "Validée",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  rejected: {
    label: "À redéposer",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
};

function isOverdue(r: DocumentRequest): boolean {
  if (!r.due_date || r.status === "validated" || r.status === "received") return false;
  return new Date(r.due_date + "T23:59:59") < new Date();
}

export function RequestsPanel({
  workspaceId,
  requests,
  template,
}: {
  workspaceId: string;
  requests: DocumentRequest[];
  template: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [pending, start] = useTransition();

  const done = requests.filter((r) => r.status === "validated").length;
  const toReview = requests.filter((r) => r.status === "received").length;
  const existing = new Set(requests.map((r) => r.title.toLowerCase()));
  const templateLeft = template.filter((t) => !existing.has(t.toLowerCase()));

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.message ?? "Action impossible.");
      router.refresh();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    run(async () => {
      const r = await createRequestsAction(workspaceId, [title], { dueDate: due || null });
      if (r.ok) {
        setTitle("");
        setDue("");
      }
      return r;
    });
  }

  async function download(id: string) {
    const r = await getRequestFileUrl(id);
    if (r.ok) window.location.assign(r.url);
    else setError(r.message);
  }

  return (
    <div className="space-y-3">
      {requests.length > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground tabular-nums">{done}</span>/
              {requests.length} validée{done > 1 ? "s" : ""}
            </span>
            {toReview > 0 && (
              <span className="font-medium text-violet-700 dark:text-violet-300">
                {toReview} à valider
              </span>
            )}
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.round((done / requests.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs leading-relaxed text-muted-foreground">
          Listez les pièces que votre client doit vous transmettre. Il les
          dépose depuis son portail, sans compte — vous êtes notifié.
        </p>
      )}

      <ul className="space-y-1.5">
        {requests.map((r) => {
          const status = REQUEST_STATUS[r.status];
          const overdue = isOverdue(r);
          return (
            <li key={r.id} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={r.title}>
                    {r.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {r.file_name && <span className="truncate">{r.file_name}</span>}
                    {r.due_date && (
                      <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-red-600 dark:text-red-400")}>
                        <CalendarClock className="h-3 w-3" />
                        {overdue ? "En retard · " : "Avant le "}
                        {formatDate(r.due_date)}
                      </span>
                    )}
                  </p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", status.className)}>
                  {status.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1">
                {r.file_path && (
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => download(r.id)}>
                    <Download className="h-3.5 w-3.5" />
                    Récupérer
                  </Button>
                )}
                {r.status === "received" && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-700 dark:text-emerald-400" disabled={pending}
                      onClick={() => run(() => reviewRequestAction(r.id, "validated"))}>
                      <Check className="h-3.5 w-3.5" />
                      Valider
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-700 dark:text-amber-400" disabled={pending}
                      onClick={() => { setRejecting(r.id); setRejectComment(""); }}>
                      <X className="h-3.5 w-3.5" />
                      Refuser
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="ml-auto h-7 w-7 p-0 text-muted-foreground hover:text-destructive" disabled={pending}
                  aria-label={`Supprimer la demande ${r.title}`}
                  onClick={() => run(() => deleteRequestAction(r.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {rejecting === r.id && (
                <div className="mt-2 flex gap-1.5">
                  <Input
                    autoFocus
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Motif (ex. document illisible)"
                    className="h-8 text-xs"
                  />
                  <Button size="sm" className="h-8" disabled={pending}
                    onClick={() => { run(() => reviewRequestAction(r.id, "rejected", rejectComment)); setRejecting(null); }}>
                    Envoyer
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="space-y-1.5">
        <div className="flex gap-1.5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Relevés bancaires de mars"
            className="h-9 text-sm"
            maxLength={160}
            aria-label="Pièce à demander"
          />
          <Button type="submit" size="sm" className="h-9 shrink-0" disabled={pending || !title.trim()}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="sr-only sm:not-sr-only">Demander</span>
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Échéance (optionnel)
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </label>
      </form>

      {templateLeft.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Pièces types de votre métier
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {templateLeft.map((t) => (
              <button
                key={t}
                type="button"
                disabled={pending}
                onClick={() => run(() => createRequestsAction(workspaceId, [t]))}
                className="rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                + {t}
              </button>
            ))}
          </div>
          {templateLeft.length > 1 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => createRequestsAction(workspaceId, templateLeft))}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <Inbox className="h-3.5 w-3.5" />
              Tout demander en un clic
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
