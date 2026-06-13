"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { href: "/dashboard/settings/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/dashboard/settings/equipe", label: "Équipe & accès", icon: Users },
  { href: "/dashboard/settings/organisation", label: "Identité", icon: Building2 },
];

/**
 * Navigation des Réglages. Volet vertical sur PC, barre déroulante sur mobile.
 * Chaque section est une page dédiée (plus rien n'est empilé).
 */
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible"
      aria-label="Sections des réglages"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary-subtle text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
