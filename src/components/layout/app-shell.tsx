"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Clock,
  HardDrive,
  Home,
  Link2,
  Lock,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { AccountMenu, type MembershipOption } from "@/components/layout/account-menu";
import { QuickCreateDialog } from "@/components/spaces/quick-create-dialog";
import { formatStorage, usagePercent } from "@/lib/plans";
import { formatBytes } from "@/lib/files";
import { cn, getInitials } from "@/lib/utils";
import type { NavSpace } from "@/lib/drive";
import type { AppNotification } from "@/lib/types/database";

export interface AppShellProps {
  org: { id: string; name: string; logo_url: string | null; primary_color: string | null };
  guest: boolean;
  user: { name: string | null; email: string };
  spaces: NavSpace[];
  storage: { used: number; limit: number | null } | null;
  unreadCount: number;
  recentNotifications: AppNotification[];
  memberships: MembershipOption[];
  newSpace: { template: string[]; nameExample: string; clientByDefault: boolean };
  children: React.ReactNode;
}

/**
 * Coque du Drive : barre latérale (navigation, espaces, stockage), barre du
 * haut (recherche, notifications, compte). Sur mobile, la barre latérale
 * devient un tiroir.
 */
export function AppShell(props: AppShellProps) {
  const { org, guest, user, unreadCount, recentNotifications, memberships, newSpace, children } = props;
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [creating, setCreating] = useState(false);

  // Le tiroir mobile se referme à chaque navigation.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawer(false);
  }

  const sidebar = (
    <Sidebar
      {...props}
      pathname={pathname}
      onNewSpace={() => {
        setDrawer(false);
        setCreating(true);
      }}
    />
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-white lg:flex">{sidebar}</aside>

      {drawer && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="animate-overlay-in absolute inset-0 bg-slate-950/40" onClick={() => setDrawer(false)} />
          <aside className="animate-drawer-in relative flex h-full w-72 max-w-[85%] flex-col bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setDrawer(false)}
              aria-label="Fermer le menu"
              className="absolute right-3 top-3.5 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-white/85 px-3 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Ouvrir le menu"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-canvas px-3 text-sm text-muted-foreground transition-colors hover:border-slate-300 hover:bg-white sm:max-w-md"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Rechercher dans le Drive…</span>
            <kbd className="ml-auto hidden rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium md:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            {!guest && <NotificationBell unreadCount={unreadCount} recent={recentNotifications} />}
            <AccountMenu
              userName={user.name}
              userEmail={user.email}
              orgName={org.name}
              guest={guest}
              memberships={memberships}
              activeOrgId={org.id}
            />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>

      <CommandPalette open={palette} onOpenChange={setPalette} guest={guest} />
      {!guest && (
        <QuickCreateDialog
          open={creating}
          onOpenChange={setCreating}
          template={newSpace.template}
          nameExample={newSpace.nameExample}
          clientByDefault={newSpace.clientByDefault}
        />
      )}
    </div>
  );
}

function Sidebar({
  org,
  guest,
  spaces,
  storage,
  pathname,
  onNewSpace,
}: AppShellProps & { pathname: string; onNewSpace: () => void }) {
  const nav: { href: string; label: string; icon: LucideIcon; active: boolean; hidden?: boolean }[] = [
    { href: "/dashboard", label: "Accueil", icon: Home, active: pathname === "/dashboard" },
    { href: "/dashboard/recents", label: "Récents", icon: Clock, active: pathname.startsWith("/dashboard/recents") },
    { href: "/dashboard/partages", label: "Liens de partage", icon: Link2, active: pathname.startsWith("/dashboard/partages"), hidden: guest },
    { href: "/dashboard/activite", label: "Activité", icon: Activity, active: pathname.startsWith("/dashboard/activite"), hidden: guest },
    { href: "/dashboard/corbeille", label: "Corbeille", icon: Trash2, active: pathname.startsWith("/dashboard/corbeille") },
  ];

  const percent = storage ? usagePercent(storage.used, storage.limit) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link href="/dashboard" className="flex h-14 shrink-0 items-center gap-2.5 px-4" aria-label="Accueil du Drive">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-black/5" />
        ) : org.primary_color ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: org.primary_color }}>
            {getInitials(org.name)}
          </span>
        ) : (
          <LogoMark className="h-8 w-8" />
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight">{org.name}</span>
          <span className="block text-[11px] text-muted-foreground">{guest ? "Accès invité" : "Drive"}</span>
        </span>
      </Link>

      {!guest && (
        <div className="px-3 pb-2 pt-1">
          <button
            type="button"
            onClick={onNewSpace}
            className="flex w-full items-center gap-2.5 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Nouvel espace
          </button>
        </div>
      )}

      <nav aria-label="Navigation principale" className="space-y-0.5 px-3 pt-1">
        {nav
          .filter((n) => !n.hidden)
          .map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={n.active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  n.active ? "bg-primary-subtle font-semibold text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {n.label}
              </Link>
            );
          })}
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-6 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {guest ? "Partagés avec vous" : "Espaces"}
          </p>
          {!guest && (
            <button type="button" onClick={onNewSpace} aria-label="Nouvel espace" className="rounded-md p-0.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {spaces.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">{guest ? "Aucun espace pour l'instant." : "Créez votre premier espace."}</li>
          )}
          {spaces.map((s) => {
            const active = pathname.startsWith(`/dashboard/workspaces/${s.id}`);
            return (
              <li key={s.id}>
                <Link
                  href={`/dashboard/workspaces/${s.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-slate-100 font-medium text-foreground" : "text-slate-600 hover:bg-slate-50 hover:text-foreground"
                  )}
                >
                  <SpaceDot space={s} />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.space_type === "internal" && !guest && <Lock className="h-3 w-3 shrink-0 text-muted-foreground/70" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 space-y-1 border-t border-border p-3">
        {storage && (
          <Link href="/dashboard/settings/abonnement" className="block rounded-lg px-3 py-2 transition-colors hover:bg-slate-50">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <HardDrive className="h-3.5 w-3.5" />
              Stockage
            </span>
            {storage.limit !== null && (
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={cn("block h-full rounded-full", percent > 95 ? "bg-red-500" : percent > 80 ? "bg-amber-500" : "bg-primary")}
                  style={{ width: `${Math.max(2, percent)}%` }}
                />
              </span>
            )}
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {formatBytes(storage.used)} utilisés{storage.limit !== null ? ` sur ${formatStorage(storage.limit)}` : ""}
            </span>
          </Link>
        )}
        <Link
          href={guest ? "/dashboard/settings/securite" : "/dashboard/settings/organisation"}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname.startsWith("/dashboard/settings") ? "bg-slate-100 font-medium text-foreground" : "text-slate-600 hover:bg-slate-50 hover:text-foreground"
          )}
        >
          {guest ? <ShieldCheck className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          {guest ? "Mon compte" : "Réglages"}
        </Link>
      </div>
    </div>
  );
}

export function SpaceDot({ space, size = "sm" }: { space: Pick<NavSpace, "name" | "primary_color" | "logo_url" | "space_type">; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 rounded-xl text-sm" : "h-6 w-6 rounded-md text-[10px]";
  if (space.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={space.logo_url} alt="" className={cn("shrink-0 object-cover ring-1 ring-black/5", box)} />;
  }
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center font-semibold text-white", box)}
      style={{ backgroundColor: space.primary_color ?? (space.space_type === "internal" ? "#475569" : "#2563eb") }}
    >
      {getInitials(space.name)}
    </span>
  );
}
