import { ArrowLeft, Building2 } from "lucide-react";
import { BrowserFrame } from "@/components/shots/browser-frame";
import { AppShell } from "@/components/shots/app-shell";
import { CanvasDrive } from "@/components/drive/canvas-drive";
import { Badge } from "@/components/ui/badge";
import {
  MOCK_DOCUMENTS,
  MOCK_FOLDERS,
  MOCK_DECISIONS,
  MOCK_VIEWED,
  MOCK_DOWNLOADED,
} from "@/lib/shots/mock";

export default function DriveShot() {
  return (
    <BrowserFrame url="docalio.app/dashboard" width={1240}>
      <AppShell>
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Tous les espaces
            </span>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Boulangerie Margot
                  </h1>
                  <Badge variant="success" dot>Actif</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Boulangerie Margot · Espace client
                </p>
              </div>
            </div>
          </div>

          <CanvasDrive
            documents={MOCK_DOCUMENTS}
            folders={MOCK_FOLDERS}
            workspaceId="ws-demo"
            decisions={MOCK_DECISIONS}
            viewedDocumentIds={MOCK_VIEWED}
            downloadedDocumentIds={MOCK_DOWNLOADED}
            maxFileBytes={20 * 1024 * 1024}
          />
        </div>
      </AppShell>
    </BrowserFrame>
  );
}
