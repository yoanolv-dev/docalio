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

  const addForm = (
    <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quelle pièce demander ? Ex. Relevés bancaires de mars"
        className="h-10 flex-1 text-sm"
        maxLength={160}
        aria-label="Pièce à demander"
      />
      <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-2.5 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        <span className="sr-only">Échéance (optionnelle)</span>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="bg-transparent text-xs text-foreground outline-none"
          title="Échéance (optionnelle)"
        />
      </label>
      <Button type="submit" className="h-10 shrink-0" disabled={pending || !title.trim()}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Demander
      </Button>
    </form>
  );

  return (
    <div className="space-y-4">
      {addForm}

      {templateLeft.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Pièces types :
          </span>
          {templateLeft.map((t) => (
            <button
              key={t}
              type="button"
              disabled={pending}
              onClick={() => run(() => createRequestsAction(workspaceId, [t]))}
              className="rounded-full border border-border bg-white px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-subtle hover:text-primary disabled:opacity-50"
            >
              + {t}
            </button>
          ))}
          {templateLeft.length > 1 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => createRequestsAction(workspaceId, templateLeft))}
              className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              <Inbox className="h-3.5 w-3.5" />
              Tout ajouter
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Inbox className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold">Aucune pièce demandée</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Ajoutez ci-dessus ce que votre client doit vous transmettre, ou
            cliquez sur une pièce type de votre métier.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-3 border-b border-border bg-canvas/60 px-4 py-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.round((done / requests.length) * 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{done}</span>/{requests.length} validée{done > 1 ? "s" : ""}
              {toReview > 0 && <span className="ml-2 font-medium text-violet-700">· {toReview} à valider</span>}
            </span>
          </div>
          <ul className="divide-y divide-border">
            {requests.map((r) => {
              const status = REQUEST_STATUS[r.status];
              const overdue = isOverdue(r);
              return (
                <li key={r.id} className="group bg-white px-4 py-3 transition-colors hover:bg-canvas/40">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={r.title}>{r.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {r.file_name && <span className="max-w-[220px] truncate">{r.file_name}</span>}
                        {r.due_date && (
                          <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-red-600")}>
                            <CalendarClock className="h-3 w-3" />
                            {overdue ? "En retard · " : "Avant le "}
                            {formatDate(r.due_date)}
                          </span>
                        )}
                        {!r.file_name && !r.due_date && <span>Sans échéance</span>}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {r.status === "received" && (
                        <>
                          <Button size="sm" className="h-8 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700" disabled={pending}
                            onClick={() => run(() => reviewRequestAction(r.id, "validated"))}>
                            <Check className="h-3.5 w-3.5" />
                            Valider
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" disabled={pending}
                            onClick={() => { setRejecting(r.id); setRejectComment(""); }}>
                            Refuser
                          </Button>
                        </>
                      )}
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", status.className, r.status === "received" && "hidden")}>
                        {status.label}
                      </span>
                      {r.file_path && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => download(r.id)}
                          aria-label={`Télécharger ${r.file_name ?? r.title}`} title="Télécharger la pièce">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100" disabled={pending}
                        aria-label={`Supprimer la demande ${r.title}`} title="Supprimer la demande"
                        onClick={() => run(() => deleteRequestAction(r.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {rejecting === r.id && (
                    <div className="mt-2.5 flex gap-1.5">
                      <Input
                        autoFocus
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        placeholder="Motif du refus (ex. document illisible)"
                        className="h-9 text-sm"
                      />
                      <Button size="sm" className="h-9" disabled={pending}
                        onClick={() => { run(() => reviewRequestAction(r.id, "rejected", rejectComment)); setRejecting(null); }}>
                        Envoyer
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9" onClick={() => setRejecting(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
