"use client";

import { useMemo, useState } from "react";
import {
  CircleCheck,
  CircleX,
  Download,
  Eye,
  FolderOpen,
  LoaderCircle,
  PartyPopper,
  PencilLine,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon } from "@/components/documents/file-icon";
import { DECISION_CONFIG } from "@/components/decisions/decision-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getPortalDownloadUrl,
  getPortalPreviewUrl,
} from "@/lib/actions/share-links";
import { submitDecisionAction } from "@/lib/actions/decisions";
import { fileTypeLabel, extensionFromMime, formatBytes } from "@/lib/files";
import { getVisitorId } from "@/lib/visitor";
import { cn, formatDate } from "@/lib/utils";
import type { DecisionType, PortalDocument } from "@/lib/types/database";
import type { PortalDecision } from "@/lib/share-links";

const DECISION_OPTIONS: {
  value: DecisionType;
  label: string;
  icon: typeof CircleCheck;
  activeClass: string;
}[] = [
  {
    value: "approved",
    label: "Approuver",
    icon: CircleCheck,
    activeClass:
      "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20",
  },
  {
    value: "changes_requested",
    label: "Demander une modification",
    icon: PencilLine,
    activeClass:
      "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20",
  },
  {
    value: "rejected",
    label: "Refuser",
    icon: CircleX,
    activeClass:
      "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20",
  },
];

const DECIDED_TONE: Record<DecisionType, string> = {
  approved:
    "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  changes_requested:
    "border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10",
  rejected:
    "border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10",
};

const DECIDED_ICON_TONE: Record<DecisionType, string> = {
  approved: "text-emerald-600 dark:text-emerald-400",
  changes_requested: "text-amber-600 dark:text-amber-400",
  rejected: "text-red-600 dark:text-red-400",
};

function PortalDocumentCard({
  token,
  doc,
  decision,
  onDecision,
}: {
  token: string;
  doc: PortalDocument;
  decision: PortalDecision | null;
  onDecision: (documentId: string, decision: PortalDecision) => void;
}) {
  const ext = extensionFromMime(doc.file_type);

  const [busy, setBusy] = useState<"preview" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Édition de décision
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<DecisionType | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handlePreview() {
    setError(null);
    setBusy("preview");
    const r = await getPortalPreviewUrl(token, doc.id, getVisitorId());
    setBusy(null);
    if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
    else setError(r.message);
  }

  async function handleDownload() {
    setError(null);
    setBusy("download");
    const r = await getPortalDownloadUrl(token, doc.id, getVisitorId());
    setBusy(null);
    if (r.ok) window.location.assign(r.url);
    else setError(r.message);
  }

  function startDecision(value: DecisionType) {
    setPending(value);
    setComment(decision?.comment ?? "");
    setEditing(true);
  }

  async function submit() {
    if (!pending) return;
    setSubmitting(true);
    setError(null);
    const r = await submitDecisionAction(
      token,
      doc.id,
      pending,
      comment,
      getVisitorId()
    );
    setSubmitting(false);
    if (r.ok) {
      onDecision(doc.id, { decision: r.decision, comment: r.comment });
      setEditing(false);
      setPending(null);
    } else {
      setError(r.message);
    }
  }

  return (
    <li className="animate-fade-up overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <FileIcon fileType={doc.file_type} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug sm:text-base">
              {doc.title}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              {ext && <span>{fileTypeLabel(ext)}</span>}
              {ext && <span aria-hidden>·</span>}
              <span>{formatBytes(doc.file_size)}</span>
              <span aria-hidden>·</span>
              <span>{formatDate(doc.created_at)}</span>
              {doc.category && (
                <>
                  <span aria-hidden>·</span>
                  <span>{doc.category}</span>
                </>
              )}
            </p>
            {doc.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                {doc.description}
              </p>
            )}
          </div>
        </div>

        {doc.allow_download && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePreview}
              disabled={busy !== null}
              className="flex-1 sm:flex-none"
            >
              {busy === "preview" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Consulter
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={busy !== null}
              className="flex-1 sm:flex-none"
            >
              {busy === "download" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Télécharger
            </Button>
          </div>
        )}
      </div>

      {/* Zone de décision */}
      <div className="border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
        {decision && !editing ? (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5",
              DECIDED_TONE[decision.decision]
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              {(() => {
                const Icon = DECISION_CONFIG[decision.decision].icon;
                return (
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      DECIDED_ICON_TONE[decision.decision]
                    )}
                  />
                );
              })()}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {DECISION_CONFIG[decision.decision].clientLabel} ce document
                </p>
                {decision.comment && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    « {decision.comment} »
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startDecision(decision.decision)}
              className="shrink-0"
            >
              Modifier ma décision
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {DECISION_OPTIONS.map((o) => {
                const Icon = o.icon;
                const active = pending === o.value;
                return (
                  <Button
                    key={o.value}
                    size="sm"
                    variant="outline"
                    onClick={() => setPending(o.value)}
                    className={cn(active && o.activeClass)}
                  >
                    <Icon className="h-4 w-4" />
                    {o.label}
                  </Button>
                );
              })}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire (optionnel)…"
              className="min-h-16 bg-card text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={submit}
                disabled={submitting || !pending}
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer ma décision
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setPending(null);
                }}
                disabled={submitting}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Votre décision :
            </span>
            {DECISION_OPTIONS.map((o) => {
              const Icon = o.icon;
              return (
                <Button
                  key={o.value}
                  size="sm"
                  variant="outline"
                  onClick={() => startDecision(o.value)}
                >
                  <Icon className="h-4 w-4" />
                  {o.label}
                </Button>
              );
            })}
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </li>
  );
}

/**
 * Espace documents du portail : progression du dossier en direct, documents
 * groupés (« à traiter » / « traités »), décisions intégrées.
 */
export function PortalDocuments({
  token,
  documents,
  initialDecisions,
  accent,
}: {
  token: string;
  documents: PortalDocument[];
  initialDecisions: Record<string, PortalDecision>;
  accent: string;
}) {
  const [decisions, setDecisions] =
    useState<Record<string, PortalDecision>>(initialDecisions);

  const { pending, treated } = useMemo(() => {
    const pending: PortalDocument[] = [];
    const treated: PortalDocument[] = [];
    for (const doc of documents) {
      (decisions[doc.id] ? treated : pending).push(doc);
    }
    return { pending, treated };
  }, [documents, decisions]);

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="Aucun document partagé"
        description="Les documents partagés par votre contact apparaîtront ici."
      />
    );
  }

  const total = documents.length;
  const done = treated.length;
  const progress = Math.round((done / total) * 100);
  const allDone = done === total;

  function handleDecision(documentId: string, decision: PortalDecision) {
    setDecisions((d) => ({ ...d, [documentId]: decision }));
  }

  return (
    <div className="space-y-8">
      {/* Avancement du dossier */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Avancement du dossier</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {done}
            </span>
            /{total} document{total > 1 ? "s" : ""} traité
            {done > 1 ? "s" : ""}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
        {allDone ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <PartyPopper className="h-4 w-4" />
            Merci ! Vous avez traité l&apos;ensemble des documents.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Consultez chaque document puis indiquez votre décision —
            validation, demande de modification ou refus.
          </p>
        )}
      </div>

      {/* À traiter */}
      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">En attente de votre retour</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-subtle px-1.5 text-xs font-semibold text-primary tabular-nums">
              {pending.length}
            </span>
          </div>
          <ul className="space-y-3">
            {pending.map((doc) => (
              <PortalDocumentCard
                key={doc.id}
                token={token}
                doc={doc}
                decision={decisions[doc.id] ?? null}
                onDecision={handleDecision}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Traités */}
      {treated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Documents traités
          </h2>
          <ul className="space-y-3">
            {treated.map((doc) => (
              <PortalDocumentCard
                key={doc.id}
                token={token}
                doc={doc}
                decision={decisions[doc.id] ?? null}
                onDecision={handleDecision}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
