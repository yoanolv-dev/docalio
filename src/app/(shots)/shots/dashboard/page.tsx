import { Plus } from "lucide-react";
import { BrowserFrame } from "@/components/shots/browser-frame";
import { AppShell } from "@/components/shots/app-shell";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { Button } from "@/components/ui/button";
import { MOCK_WORKSPACES } from "@/lib/shots/mock";

export default function DashboardShot() {
  return (
    <BrowserFrame url="docalio.app/dashboard" width={1240}>
      <AppShell active="Espaces">
        <div className="space-y-8">
          <header className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bonjour Hélène,</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                Vos espaces clients
              </h1>
            </div>
            <Button>
              <Plus className="h-4 w-4" />
              Nouvel espace
            </Button>
          </header>
          <WorkspacesList workspaces={MOCK_WORKSPACES} />
        </div>
      </AppShell>
    </BrowserFrame>
  );
}
