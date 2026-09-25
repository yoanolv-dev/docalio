// Banc d'essai interne : la vraie coque (menu latéral + barre du haut) et les
// vraies vues de l'app, alimentées par des données de démo. Sert à la revue
// visuelle et aux captures. Non indexé, non lié.
import { TopBar } from "@/components/layout/top-bar";
import { AppSidebar, type SidebarProps } from "@/components/layout/app-sidebar";
import { HomeView } from "@/components/home/home-view";
import { WorkspaceView } from "@/components/workspaces/workspace-view";
import {
  MOCK_DOCUMENTS,
  MOCK_FOLDERS,
  MOCK_DECISIONS,
  MOCK_VIEWED,
  MOCK_DOWNLOADED,
  MOCK_REQUESTS,
  MOCK_WORKSPACES,
} from "@/lib/shots/mock";
import type { ActionItem } from "@/lib/action-items";
import type { AppNotification, Organization } from "@/lib/types/database";

const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const ORG = {
  id: "org-demo", name: "Studio Hélène Roy", slug: "studio-roy", logo_url: null, primary_color: "#1c2a4e",
  plan: "pro", usage_type: "external", sector: "agence",
} as unknown as Organization;

const SIDEBAR: SidebarProps = {
  orgName: ORG.name, orgLogoUrl: null, orgColor: "#1c2a4e", planName: "Essentiel", upgradeTo: "Cabinet",
  unreadCount: 3, newSpaceLabel: "Nouvel espace client", spacesLabel: "Espaces clients",
};

const NOTIFS: AppNotification[] = [
  { id: "n1", organization_id: "o", workspace_id: "w1", type: "request_received", metadata: { request_title: "Photos de la devanture", file_name: "devanture.zip" }, read_at: null, created_at: ago(4), workspace_name: "Boulangerie Margot" },
  { id: "n2", organization_id: "o", workspace_id: "w2", type: "decision_received", metadata: { decision: "approved", document_title: "Bilan 2025" }, read_at: null, created_at: ago(38), workspace_name: "Cabinet Lenoir" },
  { id: "n3", organization_id: "o", workspace_id: "w6", type: "portal_opened", metadata: {}, read_at: ago(10), created_at: ago(95), workspace_name: "Restaurant Nord" },
  { id: "n4", organization_id: "o", workspace_id: "w4", type: "document_downloaded", metadata: { document_title: "Contrat de prestation" }, read_at: ago(10), created_at: ago(60 * 26), workspace_name: "Studio Photo Iris" },
];

const ACTIONS: ActionItem[] = [
  { id: "a1", kind: "request_to_review", title: "Photos de la devanture", workspaceId: "w1", workspaceName: "Boulangerie Margot", at: ago(4), detail: "devanture.zip" },
  { id: "a2", kind: "decision_changes", title: "Proposition commerciale", workspaceId: "w1", workspaceName: "Boulangerie Margot", at: ago(120), detail: "Pouvez-vous ajuster le calendrier ?" },
  { id: "a3", kind: "request_to_review", title: "Relevés bancaires d'août", workspaceId: "w2", workspaceName: "Cabinet Lenoir", at: ago(300), detail: "releves-aout.pdf" },
  { id: "a4", kind: "request_overdue", title: "Kbis de moins de 3 mois", workspaceId: "w6", workspaceName: "Restaurant Nord", at: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), detail: null },
];

export default async function AppPreview({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; tab?: string; w?: string }>;
}) {
  const { view = "home", tab, w = "1440" } = await searchParams;
  const ws = MOCK_WORKSPACES[0];

  return (
    <div className="flex h-[920px] overflow-hidden border bg-canvas" style={{ width: Number(w) }}>
      <aside className="hidden w-[248px] shrink-0 border-r border-border/80 bg-[var(--sidebar)] lg:block">
        <AppSidebar {...SIDEBAR} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userName="Hélène Roy" userEmail="helene@studio.fr" unreadCount={3} recentNotifications={NOTIFS} sidebar={SIDEBAR} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {view === "home" ? (
            <HomeView firstName="Hélène" usageType="external" workspaces={MOCK_WORKSPACES} actions={ACTIONS} recent={NOTIFS} />
          ) : (
            <WorkspaceView
              workspace={ws}
              documents={MOCK_DOCUMENTS}
              folders={MOCK_FOLDERS}
              shareLink={{ id: "l", organization_id: "o", workspace_id: ws.id, token: "k3Jd9sQ", expires_at: null, is_active: true, created_by: null, created_at: ago(9000) }}
              activity={{ totalOpens: 12, totalDownloads: 5, documentsDownloaded: 3, viewedDocumentIds: MOCK_VIEWED, downloadedDocumentIds: MOCK_DOWNLOADED, lastOpenAt: ago(11), lastDownloadAt: ago(1500), timeline: [
                { id: "t1", event_type: "request_fulfilled", document_id: null, document_title: null, request_title: "Photos de la devanture", visitor_id: null, created_at: ago(4) },
                { id: "t2", event_type: "document_opened", document_id: "d1", document_title: "Proposition commerciale", visitor_id: null, created_at: ago(9) },
                { id: "t3", event_type: "portal_opened", document_id: null, document_title: null, visitor_id: null, created_at: ago(11) },
              ] }}
              decisions={MOCK_DECISIONS}
              requests={MOCK_REQUESTS}
              org={ORG}
              baseUrl="https://docalio.app"
              tab={tab}
            />
          )}
        </main>
      </div>
    </div>
  );
}
