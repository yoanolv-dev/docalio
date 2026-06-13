import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Trash2,
  Building2,
  Share2,
  Activity as ActivityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { WorkspaceStatusBadge } from "@/components/workspaces/workspace-status-badge";
import { EditWorkspaceDialog } from "@/components/workspaces/edit-workspace-dialog";
import { WorkspacePipeline } from "@/components/workspaces/workspace-pipeline";
import {
  WorkspaceEngagementStats,
  WorkspaceActivityTimeline,
} from "@/components/workspaces/workspace-activity";
import { ExplorerDrive } from "@/components/drive/explorer-drive";
import { PortalShareCard } from "@/components/workspaces/portal-share-card";
import { NextActionCard } from "@/components/workspaces/next-action-card";
import { computeNextAction } from "@/lib/next-action";
import {
  archiveWorkspaceAction,
  deleteWorkspaceAction,
} from "@/lib/actions/workspaces";
import { getWorkspace } from "@/lib/workspaces";
import { listWorkspaceDocuments } from "@/lib/documents";
import { listWorkspaceFolders } from "@/lib/folders";
import { getActiveShareLink } from "@/lib/share-links";
import { getWorkspaceActivity } from "@/lib/activity";
import { getWorkspaceDecisions } from "@/lib/decisions";
import { getCurrentMembership } from "@/lib/organizations";
import { effectiveMaxFileBytes, resolvePlan } from "@/lib/plans";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Espace client",
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  const [
    documents,
    folders,
    shareLink,
    activity,
    decisions,
    headerList,
    membership,
  ] = await Promise.all([
    listWorkspaceDocuments(workspace.id),
    listWorkspaceFolders(workspace.id),
    getActiveShareLink(workspace.id),
    getWorkspaceActivity(workspace.id),
    getWorkspaceDecisions(workspace.id),
    headers(),
    getCurrentMembership(),
  ]);

  const maxFileBytes = effectiveMaxFileBytes(
    resolvePlan(membership?.organization)
  );

  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;
  const portalUrl = shareLink ? `${baseUrl}/p/${shareLink.token}` : null;

  // Synthèse des décisions sur les documents visibles client
  const visibleDocs = documents.filter((d) => d.is_visible_to_client);
  const decided = visibleDocs.filter((d) => decisions[d.id]);
  const decisionCounts = {
    approved: decided.filter((d) => decisions[d.id].decision === "approved")
      .length,
    changesRequested: decided.filter(
      (d) => decisions[d.id].decision === "changes_requested"
    ).length,
    rejected: decided.filter((d) => decisions[d.id].decision === "rejected")
      .length,
    pending: visibleDocs.length - decided.length,
  };

  // Dernier commentaire client (signal le plus récent pour la relance).
  const commentedDecisions = Object.values(decisions)
    .filter((d) => d.comment)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));

  // Relance recommandée / prochaine action (templates statiques contextualisés).
  const nextAction = computeNextAction({
    workspaceName: workspace.name,
    organizationName: membership?.organization.name ?? "votre équipe",
    portalUrl,
    hasDocuments: documents.length > 0,
    hasVisibleDocuments: visibleDocs.length > 0,
    hasActiveLink: Boolean(shareLink),
    opens: activity.totalOpens,
    downloads: activity.totalDownloads,
    decisionsApproved: decisionCounts.approved,
    decisionsChangesRequested: decisionCounts.changesRequested,
    decisionsRejected: decisionCounts.rejected,
    decisionsPending: decisionCounts.pending,
    lastComment: commentedDecisions[0]?.comment ?? null,
    lastCommentDecision: commentedDecisions[0]?.decision ?? null,
  });

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tous les espaces
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm"
              style={{
                backgroundColor:
                  workspace.primary_color ?? "var(--color-primary)",
              }}
            >
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {workspace.name}
                </h1>
                <WorkspaceStatusBadge status={workspace.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {workspace.client_company ?? "Espace client"} · Créé le{" "}
                {formatDate(workspace.created_at)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {portalUrl && (
              <CopyButton
                value={portalUrl}
                label="Copier le lien portail"
                copiedLabel="Lien copié !"
                variant="outline"
                size="sm"
              />
            )}
            <EditWorkspaceDialog workspace={workspace} />
            {workspace.status !== "archived" && (
              <form action={archiveWorkspaceAction}>
                <input type="hidden" name="workspace_id" value={workspace.id} />
                <Button type="submit" variant="ghost" size="sm">
                  <Archive className="h-4 w-4" />
                  Archiver
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Où en est le dossier — dérivé des données réelles */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <WorkspacePipeline
              input={{
                documentCount: documents.length,
                visibleCount: visibleDocs.length,
                hasActiveLink: Boolean(shareLink),
                opens: activity.totalOpens,
                decidedCount: decided.length,
                pendingCount: decisionCounts.pending,
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale : l'espace documentaire */}
        <div className="space-y-6 lg:col-span-2">
          <ExplorerDrive
            documents={documents}
            folders={folders}
            workspaceId={workspace.id}
            decisions={decisions}
            viewedDocumentIds={activity.viewedDocumentIds}
            downloadedDocumentIds={activity.downloadedDocumentIds}
            maxFileBytes={maxFileBytes}
          />

          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border pt-0">
              <InfoRow label="Société cliente" value={workspace.client_company} />
              <InfoRow label="Email" value={workspace.client_email} />
              <InfoRow label="Téléphone" value={workspace.client_phone} />
              <InfoRow label="Note interne" value={workspace.internal_note} />
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Prochaine action / relance recommandée */}
          <NextActionCard action={nextAction} />

          {/* Portail client */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <CardTitle>Portail client</CardTitle>
              </div>
              <CardDescription>
                Partagez les documents visibles via un lien sécurisé, sans
                compte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PortalShareCard
                workspaceId={workspace.id}
                link={shareLink}
                baseUrl={baseUrl}
              />
            </CardContent>
          </Card>

          {/* Activité client */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-primary" />
                <CardTitle>Activité client</CardTitle>
              </div>
              <CardDescription>
                Suivez les consultations et téléchargements de votre client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WorkspaceEngagementStats activity={activity} />
              <WorkspaceActivityTimeline timeline={activity.timeline} />
            </CardContent>
          </Card>

          {/* Suppression — volontairement discrète */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Supprimer cet espace et tous ses documents, définitivement.
            </p>
            <ConfirmDeleteDialog
              action={deleteWorkspaceAction}
              fields={{ workspace_id: workspace.id }}
              title="Supprimer cet espace client ?"
              description={`« ${workspace.name} » et tous ses documents seront définitivement supprimés. Cette action est irréversible.`}
              confirmLabel="Supprimer l'espace"
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
