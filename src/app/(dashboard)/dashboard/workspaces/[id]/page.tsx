import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Trash2,
  FileText,
  CheckCircle,
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
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { WorkspaceStatusBadge } from "@/components/workspaces/workspace-status-badge";
import { EditWorkspaceDialog } from "@/components/workspaces/edit-workspace-dialog";
import {
  WorkspaceEngagementStats,
  WorkspaceActivityTimeline,
} from "@/components/workspaces/workspace-activity";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DecisionSummary } from "@/components/decisions/decision-summary";
import { PortalShareCard } from "@/components/workspaces/portal-share-card";
import {
  archiveWorkspaceAction,
  deleteWorkspaceAction,
} from "@/lib/actions/workspaces";
import { getWorkspace } from "@/lib/workspaces";
import { listWorkspaceDocuments } from "@/lib/documents";
import { getActiveShareLink } from "@/lib/share-links";
import { getWorkspaceActivity } from "@/lib/activity";
import { getWorkspaceDecisions } from "@/lib/decisions";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Espace client",
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
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

  const [documents, shareLink, activity, decisions, headerList] =
    await Promise.all([
      listWorkspaceDocuments(workspace.id),
      getActiveShareLink(workspace.id),
      getWorkspaceActivity(workspace.id),
      getWorkspaceDecisions(workspace.id),
      headers(),
    ]);

  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;

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
  const hasDecisionContext = visibleDocs.length > 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-4">
        <Link
          href="/dashboard/workspaces"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Espaces clients
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
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

          <div className="flex items-center gap-2">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Documents — espace partagé */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle>
                  Documents
                  {documents.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {documents.length}
                    </span>
                  )}
                </CardTitle>
              </div>
              <CardDescription>
                Fichiers de cet espace. Marquez-les « visibles » pour les
                partager dans le portail client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DocumentUploadForm workspaceId={workspace.id} />
              {hasDecisionContext && (
                <DecisionSummary
                  approved={decisionCounts.approved}
                  changesRequested={decisionCounts.changesRequested}
                  rejected={decisionCounts.rejected}
                  pending={decisionCounts.pending}
                />
              )}
              {documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Aucun document"
                  description="Ajoutez votre premier document : devis, rapport, contrat ou tout fichier utile à ce client."
                />
              ) : (
                <DocumentList
                  documents={documents}
                  workspaceId={workspace.id}
                  decisions={decisions}
                />
              )}
            </CardContent>
          </Card>

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

          {/* Validation — à venir */}
          <Card className="opacity-70">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <CardTitle>Validation</CardTitle>
              </div>
              <CardDescription>
                Bientôt : demandes et suivi de validation client.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Zone de danger */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle>Zone de danger</CardTitle>
              <CardDescription>
                La suppression est définitive : l&apos;espace et ses documents
                seront perdus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfirmDeleteDialog
                action={deleteWorkspaceAction}
                fields={{ workspace_id: workspace.id }}
                title="Supprimer cet espace client ?"
                description={`« ${workspace.name} » et tous ses documents seront définitivement supprimés. Cette action est irréversible.`}
                confirmLabel="Supprimer l'espace"
                trigger={
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                    Supprimer l&apos;espace
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
