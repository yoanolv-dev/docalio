"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FolderClosed,
  House,
  LifeBuoy,
  Plus,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn, getInitials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Préfixes de route qui rendent l'entrée active. */
  match: (path: string) => boolean;
  badge?: number;
}

export interface SidebarProps {
  orgName: string;
  orgLogoUrl: string | null;
  orgColor: string | null;
  planName: string;
  /** Forfait supérieur suggéré (null si déjà au plus haut). */
  upgradeTo: string | null;
  unreadCount: number;
  newSpaceLabel: string;
  spacesLabel: string;
  onNavigate?: () => void;
}

export function AppSidebar({
  orgName,
  orgLogoUrl,
  orgColor,
  planName,
  upgradeTo,
  unreadCount,
  newSpaceLabel,
  spacesLabel,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();

  const main: NavItem[] = [
    { href: "/dashboard", label: "Accueil", icon: House, match: (p) => p === "/dashboard" },
    {
      href: "/dashboard/workspaces",
      label: spacesLabel,
      icon: FolderClosed,
      match: (p) => p.startsWith("/dashboard/workspaces") && p !== "/dashboard/workspaces/new",
    },
    {
      href: "/dashboard/notifications",
      label: "Activité",
      icon: Bell,
      match: (p) => p.startsWith("/dashboard/notifications"),
      badge: unreadCount,
    },
  ];
  const secondary: NavItem[] = [
    { href: "/dashboard/settings/organisation", label: "Réglages", icon: Settings, match: (p) => p.startsWith("/dashboard/settings") },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Organisation */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5" aria-label="Accueil">
          {orgLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgLogoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
          ) : orgColor ? (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: orgColor }}
            >
              {getInitials(orgName)}
            </span>
          ) : (
            <LogoMark className="h-8 w-8" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-foreground">{orgName}</span>
            <span className="block text-xs text-muted-foreground">Forfait {planName}</span>
          </span>
        </Link>
      </div>

      <div className="px-3 pb-2">
        <Link
          href="/dashboard/workspaces/new"
          onClick={onNavigate}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-[0_1px_2px_rgba(37,99,235,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          {newSpaceLabel}
        </Link>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {main.map((item) => (
            <SidebarLink key={item.href} item={item} active={item.match(pathname)} onNavigate={onNavigate} />
          ))}
        </ul>
        <p className="mb-1.5 mt-6 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Organisation
        </p>
        <ul className="space-y-0.5">
          {secondary.map((item) => (
            <SidebarLink key={item.href} item={item} active={item.match(pathname)} onNavigate={onNavigate} />
          ))}
          <li>
            <a
              href="mailto:contact@docalio.app"
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
            >
              <LifeBuoy className="h-4 w-4" />
              Aide & support
            </a>
          </li>
        </ul>
      </nav>

      {upgradeTo && (
        <div className="m-3 rounded-xl border border-border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Passer à {upgradeTo}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Plus d&apos;utilisateurs, votre marque sur le portail et plus d&apos;espace.
          </p>
          <Link
            href="/dashboard/settings/abonnement"
            onClick={onNavigate}
            className="mt-2.5 inline-flex text-xs font-semibold text-primary hover:underline"
          >
            Voir les forfaits →
          </Link>
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-white text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-border"
            : "text-muted-foreground hover:bg-white/70 hover:text-foreground"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="flex-1 truncate">{item.label}</span>
        {!!item.badge && item.badge > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground tabular-nums">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
