"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeftRight,
  Check,
  CreditCard,
  LogOut,
  MonitorSmartphone,
  Share,
  SquarePlus,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { promptInstall, useInstallMode } from "@/lib/pwa";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";

interface MenuLink {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  memberOnly?: boolean;
}

const LINKS: MenuLink[] = [
  { label: "Équipe et invités", description: "Membres, rôles, groupes, invités", icon: Users, href: "/dashboard/settings/equipe", memberOnly: true },
  { label: "Sécurité", description: "Double authentification", icon: ShieldCheck, href: "/dashboard/settings/securite" },
  { label: "Abonnement", description: "Forfait, stockage, facturation", icon: CreditCard, href: "/dashboard/settings/abonnement", memberOnly: true },
  { label: "Paramètres", description: "Identité de l'organisation", icon: Settings, href: "/dashboard/settings/organisation", memberOnly: true },
];

export interface MembershipOption {
  id: string;
  name: string;
  guest: boolean;
}

/** Menu du compte : réglages, sécurité, changement d'organisation, déconnexion. */
export function AccountMenu({
  userName,
  userEmail,
  orgName,
  guest = false,
  memberships = [],
  activeOrgId,
}: {
  userName: string | null;
  userEmail: string;
  orgName: string;
  guest?: boolean;
  memberships?: MembershipOption[];
  activeOrgId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const installMode = useInstallMode();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const itemClass =
    "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent";

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Menu du compte"
          title={userName ?? userEmail}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:opacity-90"
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {getInitials(userName ?? userEmail)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName ?? userEmail}</p>
              <p className="truncate text-xs text-muted-foreground">
                {orgName}
                {guest ? " · invité" : ""}
              </p>
            </div>
          </div>

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

          {LINKS.filter((l) => !guest || !l.memberOnly).map((link) => {
            const Icon = link.icon;
            return (
              <DropdownMenu.Item key={link.href} onSelect={() => router.push(link.href)} className={itemClass}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block font-medium leading-tight">{link.label}</span>
                  <span className="block text-xs text-muted-foreground">{link.description}</span>
                </span>
              </DropdownMenu.Item>
            );
          })}

          {memberships.length > 1 && (
            <>
              <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
              <p className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Changer d&apos;organisation
              </p>
              {memberships.map((m) => (
                <DropdownMenu.Item
                  key={m.id}
                  onSelect={() => {
                    window.location.href = `/dashboard/switch?org=${m.id}`;
                  }}
                  className={itemClass}
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {m.id === activeOrgId && <Check className="h-4 w-4 text-primary" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  {m.guest && <span className="text-xs text-muted-foreground">invité</span>}
                </DropdownMenu.Item>
              ))}
            </>
          )}

          {installMode && (
            <>
              <DropdownMenu.Separator className="my-1.5 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => (installMode === "ios" ? setIosHelp(true) : void promptInstall())}
                className={itemClass}
              >
                <MonitorSmartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block font-medium leading-tight">Installer l&apos;application</span>
                  <span className="block text-xs text-muted-foreground">Docalio sur votre écran d&apos;accueil</span>
                </span>
              </DropdownMenu.Item>
            </>
          )}

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

      <Dialog open={iosHelp} onOpenChange={setIosHelp}>
        <DialogContent>
          <DialogTitle>Installer Docalio sur l&apos;iPhone</DialogTitle>
          <DialogDescription>Deux gestes dans Safari, et Docalio s&apos;ouvre comme une application.</DialogDescription>
          <ol className="space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas">
                <Share className="h-4 w-4" />
              </span>
              Touchez le bouton Partager, en bas de l&apos;écran.
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas">
                <SquarePlus className="h-4 w-4" />
              </span>
              Choisissez « Sur l&apos;écran d&apos;accueil », puis « Ajouter ».
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </DropdownMenu.Root>
  );
}
