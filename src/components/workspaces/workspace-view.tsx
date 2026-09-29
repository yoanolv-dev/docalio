import Link from "next/link";
import { Activity as ActivityIcon, ArrowLeft, ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EditWorkspaceDialog } from "@/components/workspaces/edit-workspace-dialog";
import { WorkspaceActivityTimeline } from "@/components/workspaces/workspace-activity";
import { PortalShareCard } from "@/components/workspaces/portal-share-card";
import { SpaceAccessPanel } from "@/components/workspaces/space-access-panel";
import { RequestsPanel } from "@/components/requests/requests-panel";
import { DocumentsPanel } from "@/components/spaces/documents-panel";
import { LinkCard } from "@/components/spaces/link-card";
import { SpaceSettings, SettingsSection } from "@/components/spaces/space-settings";
import { archiveWorkspaceAction, deleteWorkspaceAction } from "@/lib/actions/workspaces";
import { effectiveMaxFileBytes, resolvePlan } from "@/lib/plans";
import { buildPortalUrl } from "@/lib/portal-url";
import { getSector, vocabularyFor } from "@/lib/sectors";
import { formatRelativeTime, getInitials } from "@/lib/utils";
import type { WorkspaceAccessEntry, GroupWithMembers } from "@/lib/access";
import type { OrgMember } from "@/lib/team";
import type { WorkspaceActivity } from "@/lib/activity";
import type {
  Document,
  DocumentDecision,
  DocumentRequest,
  Folder,
  Organization,
  ShareLink,
  Workspace,
} from "@/lib/types/database";

function Column({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {title}
          {!!count && (
            <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </header>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value || "-"}</span>
    </div>
  );
}

/**
 * Un espace = un lien, ce que le client doit envoyer, ce qu'on lui partage.
 * Tout le reste (infos, options du lien, accès, archivage) est dans Paramètres.
 */
export function WorkspaceView({
  workspace,
  documents,
  folders,
  shareLink,
  activity,
  decisions,
  requests,
  org,
  baseUrl,
  justCreated = false,
  spaceAccess = [],
  accessGroups = [],
  accessMembers = [],
  canManageAccess = false,
}: {
  workspace: Workspace;
  documents: Document[];
  folders: Folder[];
  shareLink: ShareLink | null;
  activity: WorkspaceActivity;
  decisions: Record<string, DocumentDecision>;
  requests: DocumentRequest[];
  org: Organization | undefined;
  baseUrl: string;
  justCreated?: boolean;
  spaceAccess?: WorkspaceAccessEntry[];
  accessGroups?: GroupWithMembers[];
  accessMembers?: OrgMember[];
  canManageAccess?: boolean;
}) {
  const isInternal = workspace.space_type === "internal";
  const vocab = vocabularyFor(org?.usage_type);
  const maxFileBytes = effectiveMaxFileBytes(resolvePlan(org));
  const portalUrl = shareLink ? buildPortalUrl(baseUrl, shareLink.token, workspace.slug) : null;
  const accent = workspace.primary_color ?? "var(--color-primary)";

  // Progression en une ligne (pas de tableau de bord).
  const validated = requests.filter((r) => r.status === "validated").length;
  const toReview = requests.filter((r) => r.status === "received").length;
  const visibleDocs = documents.filter((d) => d.is_visible_to_client);
  const approved = visibleDocs.filter((d) => decisions[d.id]?.decision === "approved").length;
  const progress: string[] = [];
  if (requests.length) {
    progress.push(`${validated}/${requests.length} pièces validées${toReview ? ` · ${toReview} à vérifier` : ""}`);
  }
  if (visibleDocs.length) progress.push(`${approved}/${visibleDocs.length} documents validés`);
  progress.push(
    activity.lastOpenAt
      ? `Ouvert ${formatRelativeTime(activity.lastOpenAt).replace(/^I/, "i")}`
      : "Pas encore ouvert par le client"
  );

  const documentsPanel = (
    <DocumentsPanel
      documents={documents}
      folders={folders}
      workspaceId={workspace.id}
      decisions={decisions}
      viewedDocumentIds={activity.viewedDocumentIds}
      downloadedDocumentIds={activity.downloadedDocumentIds}
      maxFileBytes={maxFileBytes}
      internal={isInternal}
    />
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {vocab.plural.charAt(0).toUpperCase() + vocab.plural.slice(1)}
        </Link>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-base font-semibold text-white ring-1 ring-black/5"
              style={{ backgroundColor: accent }}
            >
              {workspace.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={workspace.logo_url} alt="" className="h-full w-full object-cover" />
              ) : isInternal ? (
                <Lock className="h-5 w-5" />
              ) : (
                getInitials(workspace.client_company ?? workspace.name)
              )}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{workspace.name}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {isInternal ? "Espace interne" : workspace.client_email ?? workspace.client_company ?? "Client"}
                {workspace.status === "archived" && " · Archivé"}
              </p>
            </div>
          </div>

          <SpaceSettings title={workspace.name}>
            <SettingsSection title={isInternal ? "Informations" : "Client"}>
              <div className="divide-y divide-border">
                {!isInternal && (
                  <>
                    <InfoRow label="Société" value={workspace.client_company} />
                    <InfoRow label="E-mail" value={workspace.client_email} />
                    <InfoRow label="Téléphone" value={workspace.client_phone} />
                  </>
                )}
                <InfoRow label="Note interne" value={workspace.internal_note} />
              </div>
              <div className="mt-3">
                <EditWorkspaceDialog workspace={workspace} usageType={org?.usage_type} sector={org?.sector} />
              </div>
            </SettingsSection>

            {!isInternal && (
              <SettingsSection
                title="Lien client"
                description="Nouveau lien, page d'accueil à votre nom, désactivation."
              >
                <PortalShareCard
                  workspaceId={workspace.id}
                  link={shareLink}
                  baseUrl={baseUrl}
                  slug={workspace.slug}
                  advancedOnly
                />
              </SettingsSection>
            )}

            {isInternal && (
              <SettingsSection title="Accès" description="Les administrateurs et le créateur y ont toujours accès.">
                <SpaceAccessPanel
                  workspaceId={workspace.id}
                  access={spaceAccess}
                  groups={accessGroups}
                  members={accessMembers}
                  canManage={canManageAccess}
                />
              </SettingsSection>
            )}

            <SettingsSection title="Archiver ou supprimer">
              <div className="flex flex-wrap gap-2">
                {workspace.status !== "archived" && (
                  <form action={archiveWorkspaceAction}>
                    <input type="hidden" name="workspace_id" value={workspace.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Archiver
                    </Button>
                  </form>
                )}
                <ConfirmDeleteDialog
                  action={deleteWorkspaceAction}
                  fields={{ workspace_id: workspace.id }}
                  title={`Supprimer « ${workspace.name} » ?`}
                  description="Ses documents et ses pièces seront définitivement supprimés. Cette action est irréversible."
                  confirmLabel="Supprimer définitivement"
                  trigger={
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      Supprimer
                    </Button>
                  }
                />
              </div>
            </SettingsSection>
          </SpaceSettings>
        </div>
      </div>

      {isInternal ? (
        <Column title="Documents" hint="Visibles par les personnes qui ont accès à cet espace.">
          {documentsPanel}
        </Column>
      ) : (
        <>
          <LinkCard
            workspaceId={workspace.id}
            url={portalUrl}
            clientEmail={workspace.client_email}
            clientName={workspace.client_company}
            orgName={org?.name ?? null}
            justCreated={justCreated}
            progress={progress}
          />

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <Column
              title="À recevoir"
              hint="Ce que votre client doit vous envoyer."
              count={requests.filter((r) => r.status !== "validated").length}
            >
              <RequestsPanel
                workspaceId={workspace.id}
                requests={requests}
                template={getSector(org?.sector).requestTemplate}
              />
            </Column>
            <Column title="À partager" hint="Ce que votre client consulte et valide." count={documents.length}>
              {documentsPanel}
            </Column>
          </div>

          <details className="group rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                Historique du client
                <span className="font-normal text-muted-foreground">· {activity.timeline.length}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border px-5 py-3">
              <WorkspaceActivityTimeline timeline={activity.timeline} />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
