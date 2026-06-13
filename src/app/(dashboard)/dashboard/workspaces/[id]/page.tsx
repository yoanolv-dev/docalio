import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  ChevronDown,
  Trash2,
  Building2,
  Lock,
  Share2,
  Users,
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
import { buildPortalUrl } from "@/lib/portal-url";

export const metadata: Metadata = {
  title: "Espace client",
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
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

  const isInternal = workspace.space_type === "internal";

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
  const portalUrl = shareLink
    ? buildPortalUrl(baseUrl, shareLink.token, workspace.slug)
    : null;

  // Synthèse des décisions sur les documents visibles client (pipeline).
  const visibleDocs = documents.filter((d) => d.is_visible_to_client);
  const decided = visibleDocs.filter((d) => decisions[d.id]);
  const pendingCount = visibleDocs.length - decided.length;

  // Contenu du rail latéral : partagé entre la colonne desktop et le volet
  // repliable mobile (le Drive reste plein écran par défaut sur mobile).
  const rail = (
    <>
      {/* Partage : portail client (externe) ou accès équipe (interne) */}
      {isInternal ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Accès interne</CardTitle>
            </div>
            <CardDescription>
              Cet espace est visible par votre équipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                La gestion fine des accès par groupe d&apos;utilisateurs
                (qui voit quel espace) arrive très prochainement.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Portail client</CardTitle>
            </div>
            <CardDescription>
              Partagez les documents visibles via un lien sécurisé, sans compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalShareCard
              workspaceId={workspace.id}
              link={shareLink}
              baseUrl={baseUrl}
              slug={workspace.slug}
            />
          </CardContent>
        </Card>
      )}

      {/* Activité client — pertinent pour un espace externe (portail) */}
      {!isInternal && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Activité client</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <WorkspaceEngagementStats activity={activity} />
            <WorkspaceActivityTimeline timeline={activity.timeline} />
          </CardContent>
        </Card>
      )}

      {/* Informations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          {!isInternal && (
            <>
              <InfoRow
                label="Société cliente"
                value={workspace.client_company}
              />
              <InfoRow label="Email" value={workspace.client_email} />
              <InfoRow label="Téléphone" value={workspace.client_phone} />
            </>
          )}
          <InfoRow label="Note interne" value={workspace.internal_note} />
        </CardContent>
      </Card>

      {/* Suppression — discrète */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Supprimer cet espace et tous ses documents.
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
    </>
  );

  return (
    <div className="flex h-full flex-col gap-3">
      {/* En-tête compact : identité + actions */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            title="Tous les espaces"
            aria-label="Tous les espaces"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ backgroundColor: workspace.primary_color ?? "var(--color-primary)" }}
          >
            {isInternal ? (
              <Lock className="h-5 w-5 text-primary-foreground" />
            ) : (
              <Building2 className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {workspace.name}
              </h1>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {isInternal ? (
                  <>
                    <Lock className="h-3 w-3" />
                    Interne
                  </>
                ) : (
                  <>
                    <Building2 className="h-3 w-3" />
                    Client
                  </>
                )}
              </span>
              {!isInternal && <WorkspaceStatusBadge status={workspace.status} />}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {isInternal
                ? "Espace interne"
                : workspace.client_company ?? "Espace client"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isInternal && portalUrl && (
            <CopyButton
              value={portalUrl}
              label="Copier le lien portail"
              copiedLabel="Lien copié !"
              variant="outline"
              size="sm"
            />
          )}
          <EditWorkspaceDialog
            workspace={workspace}
            usageType={membership?.organization.usage_type}
            sector={membership?.organization.sector}
          />
          {workspace.status !== "archived" && (
            <form action={archiveWorkspaceAction}>
              <input type="hidden" name="workspace_id" value={workspace.id} />
              <Button type="submit" variant="ghost" size="sm">
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Archiver</span>
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Où en est le dossier — bandeau compact (portail client) */}
      {!isInternal && (
        <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-2.5">
          <WorkspacePipeline
            input={{
              documentCount: documents.length,
              visibleCount: visibleDocs.length,
              hasActiveLink: Boolean(shareLink),
              opens: activity.totalOpens,
              decidedCount: decided.length,
              pendingCount,
            }}
          />
        </div>
      )}

      {/* Corps : Drive plein écran + rail latéral (desktop) */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-h-0">
          <ExplorerDrive
            documents={documents}
            folders={folders}
            workspaceId={workspace.id}
            decisions={decisions}
            viewedDocumentIds={activity.viewedDocumentIds}
            downloadedDocumentIds={activity.downloadedDocumentIds}
            maxFileBytes={maxFileBytes}
          />
        </div>

        <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto pr-0.5 lg:flex">
          {rail}
        </aside>
      </div>

      {/* Mobile : partage & activité repliés (Drive plein écran par défaut) */}
      <details className="group shrink-0 overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Partage & activité
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-border p-3">{rail}</div>
      </details>
    </div>
  );
}
