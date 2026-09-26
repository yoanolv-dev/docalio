import { Plus } from "lucide-react";
import { BrowserFrame } from "@/components/shots/browser-frame";
import { AppShell } from "@/components/shots/app-shell";
import { SpacesList } from "@/components/spaces/spaces-list";
import { Button } from "@/components/ui/button";
import { MOCK_WORKSPACES } from "@/lib/shots/mock";

export default function DashboardShot() {
  return (
    <BrowserFrame url="docalio.app/dashboard" width={1240}>
      <AppShell>
        <div className="space-y-6">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">Vos espaces clients</h1>
            <Button className="rounded-xl">
              <Plus className="h-4 w-4" />
              Nouvel espace client
            </Button>
          </header>
          <SpacesList workspaces={MOCK_WORKSPACES} singular="espace client" />
        </div>
      </AppShell>
    </BrowserFrame>
  );
}
