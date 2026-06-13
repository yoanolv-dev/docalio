import {
  Bell,
  FileText,
  FolderClosed,
  Settings,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

/**
 * Réplique statique de la coque applicative (sidebar + topbar) pour les
 * captures produit. Contrôle l'élément de navigation actif et n'embarque aucune
 * action serveur.
 */
export function AppShell({
  active = "Espaces",
  children,
}: {
  active?: "Espaces" | "Notifications" | "Paramètres";
  children: React.ReactNode;
}) {
  const nav = [
    { label: "Espaces", icon: FolderClosed },
    { label: "Notifications", icon: Bell },
    { label: "Paramètres", icon: Settings },
  ];

  return (
    <div className="flex h-[760px] bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Docalio</span>
          </div>
        </div>

        <div className="border-b border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-subtle text-xs font-semibold text-primary">
              {getInitials("Studio Hélène Roy")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Studio Hélène Roy</p>
              <p className="truncate text-xs text-muted-foreground">Propriétaire</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === active;
            return (
              <span
                key={item.label}
                className={
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium " +
                  (isActive
                    ? "bg-primary-subtle text-primary"
                    : "text-sidebar-foreground/75")
                }
              >
                <Icon className={"h-4 w-4 " + (isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </span>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              HR
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Hélène Roy</p>
              <p className="truncate text-xs text-muted-foreground">helene@studio.fr</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border px-6">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </span>
        </header>
        <main className="flex-1 overflow-hidden">
          <div className="mx-auto max-w-5xl p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
