import Link from "next/link";
import {
  Activity as ActivityIcon,
  Archive,
  Building2,
  ChevronRight,
  CircleCheck,
  Eye,
  FolderOpen,
  Inbox,
  Lock,
  Share2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { WorkspaceStatusBadge } from "@/components/workspaces/workspace-status-badge";
import { EditWorkspaceDialog } from "@/components/workspaces/edit-workspace-dialog";
import {
  WorkspaceEngagementStats,
  WorkspaceActivityTimeline,
} from "@/components/workspaces/workspace-activity";
import { ExplorerDrive } from "@/components/drive/explorer-drive";
import { PortalShareCard } from "@/components/workspaces/portal-share-card";
import { SpaceAccessPanel } from "@/components/workspaces/space-access-panel";
import { RequestsPanel } from "@/components/requests/requests-panel";
import { WorkspaceTabs, type WorkspaceTab } from "@/components/workspaces/workspace-tabs";
import { archiveWorkspaceAction, deleteWorkspaceAction } from "@/lib/actions/workspaces";
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
import { effectiveMaxFileBytes, resolvePlan } from "@/lib/plans";
import { buildPortalUrl } from "@/lib/portal-url";
import { getSector, vocabularyFor } from "@/lib/sectors";
import { cn, formatDate, formatRelativeTime, getInitials } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
  icon: typeof Inbox;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
      <span className={cn("hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex", tone)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-semibold leading-tight tabular-nums sm:text-lg">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/**
 * Vue du détail d'espace (sans accès aux données) : utilisée par la page et
 * par le banc d'essai visuel. Tout arrive en props, déjà chargé.
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
  tab,
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
  tab?: string;
  spaceAccess?: WorkspaceAccessEntry[];
  accessGroups?: GroupWithMembers[];
  accessMembers?: OrgMember[];
  canManageAccess?: boolean;
}) {
  const isInternal = workspace.space_type === "internal";
  const maxFileBytes = effectiveMaxFileBytes(resolvePlan(org));
  const vocab = vocabularyFor(org?.usage_type);

  const portalUrl = shareLink ? buildPortalUrl(baseUrl, shareLink.token, workspace.slug) : null;

  // --- Indicateurs -------------------------------------------------------------
  const reqValidated = requests.filter((r) => r.status === "validated").length;
  const reqToReview = requests.filter((r) => r.status === "received").length;
  const reqOpen = requests.filter((r) => r.status === "pending" || r.status === "rejected").length;
  const visibleDocs = documents.filter((d) => d.is_visible_to_client);
  const decided = visibleDocs.filter((d) => decisions[d.id]).length;
  const approved = visibleDocs.filter((d) => decisions[d.id]?.decision === "approved").length;

  // Onglet par défaut : là où une action est attendue.
  const defaultTab = isInternal
    ? "documents"
    : requests.length > 0 || documents.length === 0
      ? "pieces"
      : "documents";

  const accent = workspace.primary_color ?? "var(--color-primary)";
  const listLabel = vocab.plural.charAt(0).toUpperCase() + vocab.plural.slice(1);

  // --- Contenus des onglets ------------------------------------------------------
  const drive = (
    <div className="h-[min(74vh,780px)] min-h-[460px]">
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
  );

  const dangerZone = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Zone sensible</CardTitle>
        <CardDescription>
          Archiver retire l&apos;espace des dossiers actifs ; supprimer est définitif.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {workspace.status !== "archived" && (
          <form action={archiveWorkspaceAction}>
            <input type="hidden" name="workspace_id" value={workspace.id} />
            <Button type="submit" variant="outline" size="sm">
              <Archive className="h-4 w-4" />
              Archiver
            </Button>
          </form>
        )}
        <ConfirmDeleteDialog
          action={deleteWorkspaceAction}
          fields={{ workspace_id: workspace.id }}
          title={`Supprimer cet ${vocab.singular} ?`}
          description={`« ${workspace.name} », ses documents et ses pièces seront définitivement supprimés. Cette action est irréversible.`}
          confirmLabel="Supprimer définitivement"
          trigger={
            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          }
        />
      </CardContent>
    </Card>
  );

  const tabs: WorkspaceTab[] = isInternal
    ? [
        { id: "documents", label: "Documents", icon: <FolderOpen />, count: documents.length, content: drive },
        {
          id: "acces",
          label: "Accès & réglages",
          icon: <Users />,
          content: (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Qui a accès à cet espace</CardTitle>
                  <CardDescription>
                    Les administrateurs et le créateur de l&apos;espace y ont toujours accès.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SpaceAccessPanel
                    workspaceId={workspace.id}
                    access={spaceAccess}
                    groups={accessGroups}
                    members={accessMembers}
                    canManage={canManageAccess}
                  />
                </CardContent>
              </Card>
              <div className="space-y-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Note interne</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{workspace.internal_note || "Aucune note."}</p>
                  </CardContent>
                </Card>
                {dangerZone}
              </div>
            </div>
          ),
        },
      ]
    : [
        {
          id: "pieces",
          label: "Pièces demandées",
          icon: <Inbox />,
          count: reqToReview + reqOpen,
          alert: reqToReview > 0,
          content: (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pièces demandées au client</CardTitle>
                  <CardDescription>
                    Il les dépose depuis son portail, sans compte. Vous êtes notifié à chaque dépôt.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RequestsPanel
                    workspaceId={workspace.id}
                    requests={requests}
                    template={getSector(org?.sector).requestTemplate}
                  />
                </CardContent>
              </Card>
              <div className="h-fit rounded-2xl border border-border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <p className="text-sm font-semibold">Ce que voit votre client</p>
                <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Il ouvre le lien de son portail, sans mot de passe.",
                    "Il voit les pièces attendues et leurs échéances.",
                    "Il dépose chaque fichier en un glisser-déposer.",
                  ].map((t, i) => (
                    <li key={t} className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[11px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ol>
                {portalUrl ? (
                  <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                    <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" />
                      Voir comme le client
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" className="mt-4 w-full" asChild>
                    <Link href="?tab=partage">
                      <Share2 className="h-4 w-4" />
                      Activer le portail
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ),
        },
        { id: "documents", label: "Documents", icon: <FolderOpen />, count: documents.length, content: drive },
        {
          id: "activite",
          label: "Activité",
          icon: <ActivityIcon />,
          content: (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Engagement du client</CardTitle>
                  <CardDescription>Mesuré sans adresse IP ni traceur publicitaire.</CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkspaceEngagementStats activity={activity} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Chronologie</CardTitle>
                </CardHeader>
                <CardContent>
                  <WorkspaceActivityTimeline timeline={activity.timeline} />
                </CardContent>
              </Card>
            </div>
          ),
        },
        {
          id: "partage",
          label: "Portail & réglages",
          icon: <Share2 />,
          content: (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Portail client</CardTitle>
                  <CardDescription>
                    Le lien donne accès aux pièces à déposer et aux documents marqués visibles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PortalShareCard
                    workspaceId={workspace.id}
                    link={shareLink}
                    baseUrl={baseUrl}
                    slug={workspace.slug}
                    clientEmail={workspace.client_email}
                    clientName={workspace.client_company}
                    orgName={org?.name}
                  />
                </CardContent>
              </Card>
              <div className="space-y-5">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base">Client</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border pt-0">
                    <InfoRow label="Société" value={workspace.client_company} />
                    <InfoRow label="E-mail" value={workspace.client_email} />
                    <InfoRow label="Téléphone" value={workspace.client_phone} />
                    <InfoRow label="Note interne" value={workspace.internal_note} />
                  </CardContent>
                </Card>
                {dangerZone}
              </div>
            </div>
          ),
        },
      ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard/workspaces" className="hover:text-foreground">
          {listLabel}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{workspace.name}</span>
      </nav>

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-semibold text-white shadow-sm ring-1 ring-black/5"
            style={{ backgroundColor: accent }}
          >
            {workspace.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={workspace.logo_url} alt="" className="h-full w-full object-cover" />
            ) : isInternal ? (
              <Lock className="h-6 w-6" />
            ) : (
              getInitials(workspace.client_company ?? workspace.name)
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{workspace.name}</h1>
              {isInternal ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Interne
                </span>
              ) : (
                <WorkspaceStatusBadge status={workspace.status} />
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {isInternal ? (
                "Espace interne à votre équipe"
              ) : (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {workspace.client_company ?? "Client"}
                  </span>
                  {workspace.client_email && <span>· {workspace.client_email}</span>}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EditWorkspaceDialog workspace={workspace} usageType={org?.usage_type} sector={org?.sector} />
          {!isInternal &&
            (portalUrl ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Voir le portail</span>
                  </a>
                </Button>
                <CopyButton value={portalUrl} label="Copier le lien client" copiedLabel="Lien copié !" size="sm" />
              </>
            ) : (
              <Button size="sm" asChild>
                <Link href="?tab=partage">
                  <Share2 className="h-4 w-4" />
                  Activer le portail
                </Link>
              </Button>
            ))}
        </div>
      </div>

      {!isInternal && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi
            icon={Inbox}
            tone="bg-violet-50 text-violet-600"
            label="Pièces"
            value={requests.length ? `${reqValidated} / ${requests.length} validées` : "Aucune demandée"}
            hint={reqToReview ? `${reqToReview} à valider` : reqOpen ? `${reqOpen} en attente du client` : "Rien en attente"}
          />
          <Kpi
            icon={CircleCheck}
            tone="bg-emerald-50 text-emerald-600"
            label="Validations"
            value={visibleDocs.length ? `${approved} / ${visibleDocs.length} approuvés` : "—"}
            hint={visibleDocs.length ? `${visibleDocs.length - decided} sans réponse` : "Aucun document partagé"}
          />
          <Kpi
            icon={Eye}
            tone="bg-sky-50 text-sky-600"
            label="Dernière visite du client"
            value={activity.lastOpenAt ? formatRelativeTime(activity.lastOpenAt) : "Jamais"}
            hint={`${activity.totalOpens} ouverture${activity.totalOpens > 1 ? "s" : ""} au total`}
          />
          <Kpi
            icon={ShieldCheck}
            tone={shareLink ? "bg-primary-subtle text-primary" : "bg-muted text-muted-foreground"}
            label="Portail"
            value={shareLink ? "Actif" : "Inactif"}
            hint={
              shareLink
                ? shareLink.expires_at
                  ? `Expire le ${formatDate(shareLink.expires_at)}`
                  : "Sans expiration"
                : "Activez-le pour partager"
            }
          />
        </div>
      )}

      <WorkspaceTabs tabs={tabs} initialTab={tab ?? defaultTab} />
    </div>
  );
}
