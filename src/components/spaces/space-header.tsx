import { Building2, Inbox, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { EditWorkspaceDialog } from "@/components/workspaces/edit-workspace-dialog";
import { WorkspaceActivityTimeline } from "@/components/workspaces/workspace-activity";
import { PortalShareCard } from "@/components/workspaces/portal-share-card";
import { SpaceAccessPanel } from "@/components/workspaces/space-access-panel";
import { RequestsPanel } from "@/components/requests/requests-panel";
import { LinkCard } from "@/components/spaces/link-card";
import { PanelDialog, SettingsSection, SpaceSettings } from "@/components/spaces/space-settings";
import { SpaceDot } from "@/components/layout/app-shell";
import { archiveWorkspaceAction, deleteWorkspaceAction } from "@/lib/actions/workspaces";
import { buildPortalUrl } from "@/lib/portal-url";
import { getSector } from "@/lib/sectors";
import { formatRelativeTime } from "@/lib/utils";
import type { WorkspaceActivity } from "@/lib/activity";
import type { WorkspaceAccessEntry, GroupWithMembers } from "@/lib/access";
import type { OrgMember } from "@/lib/team";
import type {
  AccessLevel,
  DocumentRequest,
  Organization,
  ShareLink,
  Workspace,
} from "@/lib/types/database";

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value || "-"}</span>
    </div>
  );
}

/**
 * En-tête d'un espace : identité, portail client (pièces demandées, lien,
 * historique) pour les espaces clients, et paramètres (infos, accès, archivage).
 */
export function SpaceHeader({
  workspace,
  org,
  guestLevel,
  canWrite,
  baseUrl,
  justCreated,
  portal,
  access,
}: {
  workspace: Workspace;
  org: Organization;
  /** Niveau d'accès quand l'utilisateur est un invité ; null pour un membre. */
  guestLevel: AccessLevel | null;
  canWrite: boolean;
  baseUrl: string;
  justCreated: boolean;
  portal: { link: ShareLink | null; requests: DocumentRequest[]; activity: WorkspaceActivity } | null;
  access: { entries: WorkspaceAccessEntry[]; groups: GroupWithMembers[]; members: OrgMember[]; canManage: boolean } | null;
}) {
  const isPrivate = workspace.space_type === "internal";
  const guest = guestLevel !== null;

  const subtitle = guest
    ? `Partagé avec vous · ${guestLevel === "viewer" ? "lecture seule" : "vous pouvez modifier"}`
    : isPrivate
      ? "Espace privé"
      : workspace.client_email || workspace.client_company
        ? `Espace client · ${workspace.client_email ?? workspace.client_company}`
        : "Visible par toute l'équipe";

  const toVerify = portal?.requests.filter((r) => r.status === "received").length ?? 0;
  const waiting = portal?.requests.filter((r) => r.status === "pending" || r.status === "rejected").length ?? 0;
  const portalUrl = portal?.link ? buildPortalUrl(baseUrl, portal.link.token, workspace.slug) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <SpaceDot space={workspace} size="lg" />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            <span className="truncate">{workspace.name}</span>
            {isPrivate && !guest && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </h1>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            {guest ? <Users className="h-3.5 w-3.5" /> : !isPrivate && portal ? <Building2 className="h-3.5 w-3.5" /> : null}
            {subtitle}
            {workspace.status === "archived" && " · Archivé"}
          </p>
        </div>
      </div>

      {!guest && (
        <div className="flex items-center gap-2">
          {portal && (
            <PanelDialog
              title="Portail client"
              description="Le lien sécurisé de votre client, ses pièces à fournir et son historique."
              trigger={
                <Button variant="outline" size="sm" className="h-9 rounded-xl bg-white">
                  <Inbox className="h-4 w-4" />
                  <span className="hidden sm:inline">Portail client</span>
                  {(toVerify > 0 || waiting > 0) && (
                    <span className={toVerify ? "rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white" : "rounded-full bg-canvas px-1.5 text-[11px] font-semibold text-muted-foreground"}>
                      {toVerify || waiting}
                    </span>
                  )}
                </Button>
              }
            >
              <section className="px-6 py-5">
                <LinkCard
                  workspaceId={workspace.id}
                  url={portalUrl}
                  clientEmail={workspace.client_email}
                  clientName={workspace.client_company}
                  orgName={org.name}
                  justCreated={justCreated}
                  progress={[
                    portal.requests.length
                      ? `${portal.requests.filter((r) => r.status === "validated").length}/${portal.requests.length} pièces validées${toVerify ? ` · ${toVerify} à vérifier` : ""}`
                      : "Aucune pièce demandée",
                    portal.activity.lastOpenAt
                      ? `Ouvert ${formatRelativeTime(portal.activity.lastOpenAt).replace(/^I/, "i")}`
                      : "Pas encore ouvert par le client",
                  ]}
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Le portail montre les fichiers marqués visibles par le client. Masquez un fichier depuis son menu « … ».
                </p>
              </section>
              <SettingsSection title="Pièces à fournir" description="Ce que votre client doit vous envoyer.">
                <RequestsPanel workspaceId={workspace.id} requests={portal.requests} template={getSector(org.sector).requestTemplate} />
              </SettingsSection>
              <SettingsSection title="Historique du client">
                <WorkspaceActivityTimeline timeline={portal.activity.timeline} />
              </SettingsSection>
            </PanelDialog>
          )}

          <SpaceSettings title={workspace.name}>
            <SettingsSection title="Informations">
              <div className="divide-y divide-border">
                {!isPrivate && (
                  <>
                    <InfoRow label="Société" value={workspace.client_company} />
                    <InfoRow label="E-mail" value={workspace.client_email} />
                    <InfoRow label="Téléphone" value={workspace.client_phone} />
                  </>
                )}
                <InfoRow label="Note interne" value={workspace.internal_note} />
              </div>
              {canWrite && (
                <div className="mt-3">
                  <EditWorkspaceDialog workspace={workspace} usageType={org.usage_type} sector={org.sector} />
                </div>
              )}
            </SettingsSection>

            {portal && (
              <SettingsSection title="Lien du portail client" description="Nouveau lien, adresse à votre nom, désactivation.">
                <PortalShareCard workspaceId={workspace.id} link={portal.link} baseUrl={baseUrl} slug={workspace.slug} advancedOnly />
              </SettingsSection>
            )}

            {isPrivate && access && (
              <SettingsSection title="Membres de l'équipe ayant accès" description="Les administrateurs et le créateur y ont toujours accès. Les invités extérieurs se gèrent depuis « Partager ».">
                <SpaceAccessPanel
                  workspaceId={workspace.id}
                  access={access.entries}
                  groups={access.groups}
                  members={access.members}
                  canManage={access.canManage}
                />
              </SettingsSection>
            )}

            {canWrite && (
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
                    description="Tous ses dossiers, fichiers, versions et liens seront définitivement supprimés. Cette action est irréversible."
                    confirmLabel="Supprimer définitivement"
                    trigger={
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                        Supprimer
                      </Button>
                    }
                  />
                </div>
              </SettingsSection>
            )}
          </SpaceSettings>
        </div>
      )}
    </div>
  );
}
