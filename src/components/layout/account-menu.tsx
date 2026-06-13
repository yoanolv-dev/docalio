"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CreditCard,
  FolderClosed,
  LogOut,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

interface MenuLink {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const LINKS: MenuLink[] = [
  {
    label: "Espaces clients",
    description: "Tous vos dossiers clients",
    icon: FolderClosed,
    href: "/dashboard",
  },
  {
    label: "Équipe & accès",
    description: "Invitez et gérez les rôles",
    icon: Users,
    href: "/dashboard/settings#equipe",
  },
  {
    label: "Abonnement",
    description: "Plan, usage & facturation",
    icon: CreditCard,
    href: "/dashboard/settings#abonnement",
  },
  {
    label: "Paramètres",
    description: "Identité de l'organisation",
    icon: Settings,
    href: "/dashboard/settings#identite",
  },
];

/**
 * Menu de compte du dashboard. Rend visibles et accessibles d'un clic les
 * fonctionnalités auparavant cachées (équipe, abonnement, paramètres) — en
 * complément de la palette ⌘K.
 */
export function AccountMenu({
  userName,
  userEmail,
  orgName,
}: {
  userName: string | null;
  userEmail: string;
  orgName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Menu du compte"
          title={userName ?? userEmail}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:opacity-90"
        >
          {getInitials(userName ?? userEmail)}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="animate-fade-up z-[60] w-72 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-3 px-2.5 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {getInitials(userName ?? userEmail)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {userName ?? userEmail}
              </p>
              <p className="truncate text-xs text-muted-foreground">{orgName}</p>
            </div>
          </div>

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <DropdownMenu.Item
                key={link.href}
                onSelect={() => router.push(link.href)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block font-medium leading-tight">
                    {link.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {link.description}
                  </span>
                </span>
              </DropdownMenu.Item>
            );
          })}

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={signOut}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="font-medium">Déconnexion</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
