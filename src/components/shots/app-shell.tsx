import { Bell, Search } from "lucide-react";

/**
 * Réplique statique de la coque applicative pour les captures produit.
 * Reflète la navigation réelle : une barre fine, deux destinations.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[820px] bg-canvas">
      <header className="border-b border-border/70 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1c2a4e] text-[11px] font-semibold text-white">
            SR
          </span>
          <span className="text-sm font-semibold">Studio Hélène Roy</span>
          <nav className="ml-4 flex items-center gap-0.5 text-sm font-medium">
            <span className="rounded-lg bg-canvas px-3 py-1.5 text-foreground ring-1 ring-border/80">Espaces clients</span>
            <span className="px-3 py-1.5 text-muted-foreground">Réglages</span>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="flex h-9 items-center gap-2 px-2.5 text-muted-foreground">
              <Search className="h-[18px] w-[18px]" />
            </span>
            <span className="relative flex h-9 w-9 items-center justify-center text-muted-foreground">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
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
