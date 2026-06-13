import { Bell, Building2, FileText, Search, ShieldCheck } from "lucide-react";
import { BrowserFrame } from "@/components/shots/browser-frame";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { ExplorerDrive } from "@/components/drive/explorer-drive";
import { PortalDocuments } from "@/components/portal/portal-documents";
import { Badge } from "@/components/ui/badge";
import {
  MOCK_WORKSPACES,
  MOCK_DOCUMENTS,
  MOCK_FOLDERS,
  MOCK_DECISIONS,
  MOCK_VIEWED,
  MOCK_DOWNLOADED,
  MOCK_PORTAL_DOCUMENTS,
  MOCK_PORTAL_FOLDERS,
  MOCK_PORTAL_DECISIONS,
} from "@/lib/shots/mock";

const ACCENT = "#1c2a4e";

/**
 * Aperçus produit « live » : on rend les vrais composants de l'application
 * (avec données fictives) dans un cadre fenêtre Windows, plutôt que des PNG
 * statiques. Avantage : l'image marketing reflète toujours exactement le
 * produit et le thème en vigueur. Les aperçus sont volontairement non
 * interactifs (`pointer-events-none`) — ils illustrent, ils ne pilotent rien.
 */
function PreviewTopBar() {
  return (
    <header className="flex h-12 items-center gap-3 border-b border-border bg-background px-4">
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
          <FileText className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Docalio</span>
      </div>
      <span className="hidden h-5 w-px bg-border sm:block" />
      <span className="hidden text-sm font-medium text-muted-foreground sm:block">
        Studio Hélène Roy
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="flex h-8 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Rechercher…</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
            Ctrl K
          </kbd>
        </span>
        <span className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
          HR
        </span>
      </div>
    </header>
  );
}

export function DashboardPreview() {
  return (
    <BrowserFrame url="docalio.app/dashboard">
      <div className="bg-background">
        <PreviewTopBar />
        <div className="pointer-events-none select-none px-5 py-5">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Bonjour Hélène,</p>
              <h3 className="mt-0.5 text-xl font-semibold tracking-tight">
                Vos espaces clients
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Nouvel espace
            </span>
          </div>
          <div className="h-[400px]">
            <WorkspacesList workspaces={MOCK_WORKSPACES} />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function DrivePreview() {
  return (
    <BrowserFrame url="docalio.app/dashboard/espaces/boulangerie-margot">
      <div className="bg-background">
        <PreviewTopBar />
        <div className="pointer-events-none select-none px-5 py-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">Boulangerie Margot</h3>
                <Badge variant="success" dot>Actif</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Espace documentaire · Boulangerie Margot</p>
            </div>
          </div>
          <div className="h-[440px]">
            <ExplorerDrive
              documents={MOCK_DOCUMENTS}
              folders={MOCK_FOLDERS}
              workspaceId="ws-demo"
              decisions={MOCK_DECISIONS}
              viewedDocumentIds={MOCK_VIEWED}
              downloadedDocumentIds={MOCK_DOWNLOADED}
              maxFileBytes={20 * 1024 * 1024}
            />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function PortalPreview() {
  return (
    <BrowserFrame url="docalio.app/p/votre-espace">
      <div className="bg-muted/30">
        <div aria-hidden className="h-1" style={{ backgroundColor: ACCENT }} />
        <header className="border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: ACCENT }}
              >
                HR
              </div>
              <div>
                <p className="text-sm font-semibold">Studio Hélène Roy</p>
                <p className="text-xs text-muted-foreground">Espace documentaire</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Accès sécurisé
            </span>
          </div>
        </header>
        <main className="pointer-events-none select-none space-y-6 px-5 py-7">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
              Votre espace privé
            </p>
            <h3 className="text-xl font-semibold tracking-tight">Boulangerie Margot</h3>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Consultez vos documents, téléchargez-les et indiquez votre décision.
            </p>
          </div>
          <PortalDocuments
            token="demo"
            documents={MOCK_PORTAL_DOCUMENTS}
            folders={MOCK_PORTAL_FOLDERS}
            initialDecisions={MOCK_PORTAL_DECISIONS}
            accent={ACCENT}
          />
        </main>
      </div>
    </BrowserFrame>
  );
}
