"use client";

import { useState } from "react";
import {
  Download,
  Eye,
  LoaderCircle,
  CircleCheck,
  CircleX,
  PencilLine,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon } from "@/components/documents/file-icon";
import {
  DECISION_CONFIG,
  DecisionBadge,
} from "@/components/decisions/decision-badge";
import {
  getPortalDownloadUrl,
  getPortalPreviewUrl,
} from "@/lib/actions/share-links";
import { submitDecisionAction } from "@/lib/actions/decisions";
import { fileTypeLabel, extensionFromMime, formatBytes } from "@/lib/files";
import { getVisitorId } from "@/lib/visitor";
import { formatDate } from "@/lib/utils";
import type { DecisionType, PortalDocument } from "@/lib/types/database";
import type { PortalDecision } from "@/lib/share-links";

const DECISION_OPTIONS: { value: DecisionType; label: string }[] = [
  { value: "approved", label: "Approuver" },
  { value: "changes_requested", label: "Demander une modification" },
  { value: "rejected", label: "Refuser" },
];

const DECISION_ICON = {
  approved: CircleCheck,
  changes_requested: PencilLine,
  rejected: CircleX,
} as const;

function PortalDocumentCard({
  token,
  doc,
  initial,
}: {
  token: string;
  doc: PortalDocument;
  initial?: PortalDecision;
}) {
  const ext = extensionFromMime(doc.file_type);

  const [decision, setDecision] = useState<PortalDecision | null>(
    initial ?? null
  );
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
      setDecision({ decision: r.decision, comment: r.comment });
      setEditing(false);
      setPending(null);
    } else {
      setError(r.message);
    }
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileIcon fileType={doc.file_type} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">{doc.title}</p>
            {decision && <DecisionBadge decision={decision.decision} />}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {ext && <span>{fileTypeLabel(ext)}</span>}
            {ext && <span>·</span>}
            <span>{formatBytes(doc.file_size)}</span>
            <span>·</span>
            <span>{formatDate(doc.created_at)}</span>
          </p>
          {doc.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {doc.description}
            </p>
          )}
        </div>

        {doc.allow_download && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePreview}
              disabled={busy !== null}
              title="Aperçu"
            >
              {busy === "preview" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Aperçu</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={busy !== null}
              title="Télécharger"
            >
              {busy === "download" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
          </div>
        )}
      </div>

      {/* Zone de décision */}
      <div className="mt-3 border-t border-border pt-3">
        {decision && !editing ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                {DECISION_CONFIG[decision.decision].clientLabel}
              </p>
              {decision.comment && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  « {decision.comment} »
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startDecision(decision.decision)}
            >
              Modifier
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {DECISION_OPTIONS.map((o) => {
                const Icon = DECISION_ICON[o.value];
                const active = pending === o.value;
                return (
                  <Button
                    key={o.value}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => setPending(o.value)}
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
              className="min-h-16 text-sm"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={submit} disabled={submitting || !pending}>
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
            <span className="text-xs text-muted-foreground">Votre décision :</span>
            {DECISION_OPTIONS.map((o) => {
              const Icon = DECISION_ICON[o.value];
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

export function PortalDocumentList({
  token,
  documents,
  decisions,
}: {
  token: string;
  documents: PortalDocument[];
  decisions: Record<string, PortalDecision>;
}) {
  return (
    <ul className="space-y-3">
      {documents.map((doc) => (
        <PortalDocumentCard
          key={doc.id}
          token={token}
          doc={doc}
          initial={decisions[doc.id]}
        />
      ))}
    </ul>
  );
}
