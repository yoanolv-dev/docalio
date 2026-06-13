import { Bell, FileText, Search } from "lucide-react";

/**
 * Réplique statique de la coque applicative (barre supérieure) pour les
 * captures produit. Reflète la navigation réelle : pas de sidebar, Ctrl K + avatar.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[820px] bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Docalio</span>
          </div>
          <span className="h-5 w-px bg-border" />
          <span className="text-sm font-medium text-muted-foreground">
            Studio Hélène Roy
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              Rechercher…
              <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                Ctrl K
              </kbd>
            </span>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              HR
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
