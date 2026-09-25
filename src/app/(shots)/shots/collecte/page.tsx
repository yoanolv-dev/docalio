import { Activity, Building2, Inbox } from "lucide-react";
import { BrowserFrame } from "@/components/shots/browser-frame";
import { AppShell } from "@/components/shots/app-shell";
import { RequestsPanel } from "@/components/requests/requests-panel";
import { WorkspaceActivityTimeline } from "@/components/workspaces/workspace-activity";
import { MOCK_REQUESTS } from "@/lib/shots/mock";
import type { ActivityEvent } from "@/lib/types/database";

const at = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const TIMELINE: ActivityEvent[] = [
  { id: "e1", event_type: "request_fulfilled", document_id: null, document_title: null, request_title: "Photos de la devanture", visitor_id: null, created_at: at(4) },
  { id: "e2", event_type: "document_opened", document_id: "d1", document_title: "Proposition commerciale", visitor_id: null, created_at: at(9) },
  { id: "e3", event_type: "portal_opened", document_id: null, document_title: null, visitor_id: null, created_at: at(11) },
  { id: "e4", event_type: "request_fulfilled", document_id: null, document_title: null, request_title: "Kbis de moins de 3 mois", visitor_id: null, created_at: at(60 * 26) },
  { id: "e5", event_type: "document_downloaded", document_id: "d4", document_title: "Contrat de prestation", visitor_id: null, created_at: at(60 * 27) },
];

export default function CollecteShot() {
  return (
    <BrowserFrame url="docalio.app/dashboard/espaces/boulangerie-margot" width={1180}>
      <AppShell>
        <div className="space-y-5">
          <header className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d97706]">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Boulangerie Margot</h1>
              <p className="text-xs text-muted-foreground">Refonte du site · portail actif</p>
            </div>
          </header>
          <div className="grid grid-cols-[1fr_1fr] gap-5">
            <section className="rounded-xl border border-border bg-card p-5">
              <p className="flex items-center gap-2 text-base font-semibold">
                <Inbox className="h-4 w-4 text-primary" />
                Pièces demandées
              </p>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                Votre client les dépose depuis son portail, sans compte.
              </p>
              <RequestsPanel
                workspaceId="demo"
                requests={MOCK_REQUESTS}
                template={["Bon de commande signé", "Accès aux comptes"]}
              />
            </section>
            <section className="rounded-xl border border-border bg-card p-5">
              <p className="mb-4 flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4 text-primary" />
                Activité client — en direct
              </p>
              <WorkspaceActivityTimeline timeline={TIMELINE} />
            </section>
          </div>
        </div>
      </AppShell>
    </BrowserFrame>
  );
}
