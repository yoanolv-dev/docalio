"use client";

import { useMemo, useState } from "react";
import {
  CircleCheck,
  CircleX,
  Download,
  Eye,
  FolderClosed,
  Layers,
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
import type {
  DecisionType,
  PortalDocument,
  PortalFolder,
} from "@/lib/types/database";
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
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    value: "changes_requested",
    label: "Demander une modification",
    icon: PencilLine,
    activeClass:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    value: "rejected",
    label: "Refuser",
    icon: CircleX,
    activeClass:
      "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400",
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
  folderName,
  decision,
  onDecision,
}: {
  token: string;
  doc: PortalDocument;
  folderName: string | null;
  decision: PortalDecision | null;
  onDecision: (documentId: string, decision: PortalDecision) => void;
}) {
  const ext = extensionFromMime(doc.file_type);
  const [busy, setBusy] = useState<"preview" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    const r = await submitDecisionAction(token, doc.id, pending, comment, getVisitorId());
    setSubmitting(false);
    if (r.ok) {
      onDecision(doc.id, { decision: r.decision, comment: r.comment });
      setEditing(false);
      setPending(null);
    } else setError(r.message);
  }

  return (
    <li className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <FileIcon fileType={doc.file_type} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug sm:text-base">
              {doc.title}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              {folderName && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <FolderClosed className="h-3 w-3" />
                    {folderName}
                  </span>
                  <span aria-hidden>·</span>
                </>
              )}
              {ext && <span>{fileTypeLabel(ext)}</span>}
              {ext && <span aria-hidden>·</span>}
              <span>{formatBytes(doc.file_size)}</span>
              <span aria-hidden>·</span>
              <span>{formatDate(doc.created_at)}</span>
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
            <Button size="sm" variant="outline" onClick={handlePreview} disabled={busy !== null} className="flex-1 sm:flex-none">
              {busy === "preview" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Consulter
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={busy !== null} className="flex-1 sm:flex-none">
              {busy === "download" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Télécharger
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
        {decision && !editing ? (
          <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5", DECIDED_TONE[decision.decision])}>
            <div className="flex min-w-0 items-start gap-2">
              {(() => {
                const Icon = DECISION_CONFIG[decision.decision].icon;
                return <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", DECIDED_ICON_TONE[decision.decision])} />;
              })()}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {DECISION_CONFIG[decision.decision].clientLabel} ce document
                </p>
                {decision.comment && (
                  <p className="mt-0.5 text-xs text-muted-foreground">« {decision.comment} »</p>
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => startDecision(decision.decision)} className="shrink-0">
              Modifier
            </Button>
          </div>
        ) : editing ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {DECISION_OPTIONS.map((o) => {
                const Icon = o.icon;
                const active = pending === o.value;
                return (
                  <Button key={o.value} size="sm" variant="outline" onClick={() => setPending(o.value)} className={cn(active && o.activeClass)}>
                    <Icon className="h-4 w-4" />
                    {o.label}
                  </Button>
                );
              })}
            </div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ajouter un commentaire (optionnel)…" className="min-h-16 bg-card text-sm" />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={submit} disabled={submitting || !pending}>
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Envoyer ma décision
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setPending(null); }} disabled={submitting}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Votre décision :</span>
            {DECISION_OPTIONS.map((o) => {
              const Icon = o.icon;
              return (
                <Button key={o.value} size="sm" variant="outline" onClick={() => startDecision(o.value)}>
                  <Icon className="h-4 w-4" />
                  {o.label}
                </Button>
              );
            })}
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </li>
  );
}

/**
 * Espace documents du portail. Menu clair pour le client : filtres par dossier
 * (si présents) + regroupement orienté action (« à traiter » / « terminés »),
 * progression du dossier en direct, décisions intégrées.
 */
export function PortalDocuments({
  token,
  documents,
  folders,
  initialDecisions,
  accent,
}: {
  token: string;
  documents: PortalDocument[];
  folders: PortalFolder[];
  initialDecisions: Record<string, PortalDecision>;
  accent: string;
}) {
  const [decisions, setDecisions] =
    useState<Record<string, PortalDecision>>(initialDecisions);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  const folderName = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of folders) map.set(f.id, f.name);
    return map;
  }, [folders]);

  const descendantsOf = useMemo(() => {
    const childrenOf = new Map<string, string[]>();
    for (const f of folders) {
      if (!f.parent_id) continue;
      const l = childrenOf.get(f.parent_id) ?? [];
      l.push(f.id);
      childrenOf.set(f.parent_id, l);
    }
    return (rootId: string) => {
      const out = new Set<string>([rootId]);
      const stack = [rootId];
      while (stack.length) {
        const id = stack.pop()!;
        for (const c of childrenOf.get(id) ?? []) {
          if (!out.has(c)) { out.add(c); stack.push(c); }
        }
      }
      return out;
    };
  }, [folders]);

  const topFolders = useMemo(
    () => folders.filter((f) => !f.parent_id),
    [folders]
  );

  const shown = useMemo(() => {
    if (!activeFolder) return documents;
    const branch = descendantsOf(activeFolder);
    return documents.filter((d) => d.folder_id && branch.has(d.folder_id));
  }, [documents, activeFolder, descendantsOf]);

  const { pending, treated } = useMemo(() => {
    const pending: PortalDocument[] = [];
    const treated: PortalDocument[] = [];
    for (const doc of shown) (decisions[doc.id] ? treated : pending).push(doc);
    return { pending, treated };
  }, [shown, decisions]);

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FolderClosed}
        title="Aucun document partagé"
        description="Les documents partagés par votre contact apparaîtront ici."
      />
    );
  }

  const total = documents.length;
  const done = documents.filter((d) => decisions[d.id]).length;
  const progress = Math.round((done / total) * 100);
  const allDone = done === total;

  function handleDecision(documentId: string, decision: PortalDecision) {
    setDecisions((d) => ({ ...d, [documentId]: decision }));
  }

  return (
    <div className="space-y-6">
      {/* Avancement */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Avancement</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{done}</span>
            /{total} traité{done > 1 ? "s" : ""}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: accent }} />
        </div>
        {allDone ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <PartyPopper className="h-4 w-4" />
            Merci ! Vous avez traité l&apos;ensemble des documents.
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Consultez chaque document, puis indiquez votre décision.
          </p>
        )}
      </div>

      {/* Menu par dossier (si l'espace est organisé en dossiers) */}
      {topFolders.length > 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
              activeFolder === null
                ? "border-transparent bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Tout
          </button>
          {topFolders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFolder(f.id)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                activeFolder === f.id
                  ? "border-transparent bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <FolderClosed className="h-3.5 w-3.5" />
              {f.name}
            </button>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">À traiter</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {pending.length}
            </span>
          </div>
          <ul className="space-y-3">
            {pending.map((doc) => (
              <PortalDocumentCard
                key={doc.id}
                token={token}
                doc={doc}
                folderName={doc.folder_id ? folderName.get(doc.folder_id) ?? null : null}
                decision={decisions[doc.id] ?? null}
                onDecision={handleDecision}
              />
            ))}
          </ul>
        </section>
      )}

      {treated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Terminés</h2>
          <ul className="space-y-3">
            {treated.map((doc) => (
              <PortalDocumentCard
                key={doc.id}
                token={token}
                doc={doc}
                folderName={doc.folder_id ? folderName.get(doc.folder_id) ?? null : null}
                decision={decisions[doc.id] ?? null}
                onDecision={handleDecision}
              />
            ))}
          </ul>
        </section>
      )}

      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Aucun document dans ce dossier.
        </p>
      )}
    </div>
  );
}
