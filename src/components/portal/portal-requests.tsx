"use client";

import { useRef, useState } from "react";
import {
  CalendarClock,
  CircleCheck,
  CloudUpload,
  Hourglass,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { uploadPortalRequestAction } from "@/lib/actions/requests";
import { FILE_ACCEPT_ATTRIBUTE } from "@/lib/files";
import { getVisitorId } from "@/lib/visitor";
import { cn, formatDate } from "@/lib/utils";
import type { PortalRequest } from "@/lib/types/database";

function RequestRow({
  token,
  request,
  accent,
  onDone,
}: {
  token: string;
  request: PortalRequest;
  accent: string;
  onDone: (id: string, fileName: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = request.status === "pending" || request.status === "rejected";

  async function send(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("visitor_id", getVisitorId() ?? "");
    const r = await uploadPortalRequestAction(token, request.id, fd);
    setBusy(false);
    if (r.ok) onDone(request.id, r.fileName ?? file.name);
    else setError(r.message ?? "L'envoi a échoué.");
  }

  return (
    <li
      onDragOver={(e) => {
        if (!open) return;
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!open) return;
        e.preventDefault();
        setDrag(false);
        send(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
        drag ? "border-dashed" : "border-border"
      )}
      style={drag ? { borderColor: accent } : undefined}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{request.title}</p>
        {request.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{request.description}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {request.due_date && open && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              À fournir avant le {formatDate(request.due_date)}
            </span>
          )}
          {request.status === "rejected" && (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              À redéposer{request.review_comment ? ` : ${request.review_comment}` : ""}
            </span>
          )}
          {request.status === "received" && (
            <span className="inline-flex items-center gap-1">
              <Hourglass className="h-3 w-3" />
              Reçu{request.file_name ? ` · ${request.file_name}` : ""}, en cours de vérification
            </span>
          )}
          {request.status === "validated" && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
              <CircleCheck className="h-3 w-3" />
              Validé
            </span>
          )}
        </p>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {open && (
        <>
          <input
            ref={input}
            type="file"
            accept={FILE_ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => send(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            style={{ backgroundColor: accent }}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : request.status === "rejected" ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            {busy ? "Envoi…" : request.status === "rejected" ? "Redéposer" : "Déposer"}
          </button>
        </>
      )}
    </li>
  );
}

/** Pièces demandées par le cabinet, déposables sans compte depuis le portail. */
export function PortalRequests({
  token,
  requests: initial,
  accent,
}: {
  token: string;
  requests: PortalRequest[];
  accent: string;
}) {
  const [requests, setRequests] = useState(initial);
  if (requests.length === 0) return null;

  const openCount = requests.filter(
    (r) => r.status === "pending" || r.status === "rejected"
  ).length;

  function onDone(id: string, fileName: string) {
    setRequests((list) =>
      list.map((r) =>
        r.id === id ? { ...r, status: "received", file_name: fileName, review_comment: null } : r
      )
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="pieces-a-fournir">
      <div className="flex items-center justify-between gap-2">
        <h2 id="pieces-a-fournir" className="flex items-center gap-2 text-sm font-semibold">
          Pièces à fournir
          {openCount > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white tabular-nums"
              style={{ backgroundColor: accent }}
            >
              {openCount}
            </span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground">
          {openCount === 0 ? "Tout est transmis, merci !" : "Glissez un fichier ou cliquez sur Déposer"}
        </p>
      </div>
      <ul className="space-y-2.5">
        {requests.map((r) => (
          <RequestRow key={r.id} token={token} request={r} accent={accent} onDone={onDone} />
        ))}
      </ul>
    </section>
  );
}
