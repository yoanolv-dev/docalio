import { ShieldCheck } from "lucide-react";
import { BrowserFrame } from "@/components/shots/browser-frame";
import { PortalDocuments } from "@/components/portal/portal-documents";
import {
  MOCK_PORTAL_DOCUMENTS,
  MOCK_PORTAL_FOLDERS,
  MOCK_PORTAL_DECISIONS,
} from "@/lib/shots/mock";

const accent = "#1c2a4e";

export default function PortalShot() {
  return (
    <BrowserFrame url="docalio.app/p/votre-espace" width={860}>
      <div className="bg-muted/30">
        <div aria-hidden className="h-1" style={{ backgroundColor: accent }} />
        <header className="border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
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

        <main className="space-y-8 px-6 py-10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>
              Votre espace privé
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Boulangerie Margot
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Studio Hélène Roy a préparé cet espace pour vous. Consultez vos
              documents, téléchargez-les et indiquez votre décision.
            </p>
          </div>

          <PortalDocuments
            token="demo"
            documents={MOCK_PORTAL_DOCUMENTS}
            folders={MOCK_PORTAL_FOLDERS}
            initialDecisions={MOCK_PORTAL_DECISIONS}
            accent={accent}
          />
        </main>
      </div>
    </BrowserFrame>
  );
}
