import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CircleCheck,
  Clock,
  Inbox,
  Link2,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { WorkspacesList } from "@/components/workspaces/workspaces-list";
import { ActionList } from "@/components/home/action-list";
import { NotificationRow } from "@/components/notifications/notification-row";
import { Button } from "@/components/ui/button";
import { vocabularyFor } from "@/lib/sectors";
import { cn } from "@/lib/utils";

import type { WorkspaceListItem } from "@/lib/workspaces";
import type { ActionItem } from "@/lib/action-items";
import type { AppNotification, UsageType } from "@/lib/types/database";

function greeting(): string {
  const h = Number(
    new Intl.DateTimeFormat("fr-FR", { hour: "numeric", timeZone: "Europe/Paris" }).format(new Date())
  );
  return h < 5 || h >= 18 ? "Bonsoir" : "Bonjour";
}

/** Vue de l'accueil (données déjà chargées) — partagée avec le banc d'essai. */
export function HomeView({
  firstName,
  usageType,
  workspaces,
  actions,
  recent,
}: {
  firstName: string | null;
  usageType: UsageType | null | undefined;
  workspaces: WorkspaceListItem[];
  actions: ActionItem[];
  recent: AppNotification[];
}) {
  const vocab = vocabularyFor(usageType);

  const live = workspaces.filter((w) => w.status !== "archived");
  const shared = workspaces.filter((w) => w.hasActiveLink).length;
  const openRequests = workspaces.reduce((s, w) => s + w.openRequests, 0);
  const pendingDecisions = workspaces.reduce((s, w) => s + w.pendingDecisions, 0);

  const kpis = [
    { icon: Building2, label: vocab.plural.charAt(0).toUpperCase() + vocab.plural.slice(1) + " actifs", value: live.length, tone: "text-primary bg-primary-subtle" },
    { icon: Link2, label: "Portails partagés", value: shared, tone: "text-sky-600 bg-sky-50" },
    { icon: Inbox, label: "Pièces attendues", value: openRequests, tone: "text-violet-600 bg-violet-50" },
    { icon: Clock, label: "Validations en attente", value: pendingDecisions, tone: "text-amber-600 bg-amber-50" },
  ];

  // Premiers pas : guide tant que l'essentiel n'est pas fait.
  const steps = [
    { done: workspaces.length > 0, label: `Créer un ${vocab.singular}`, href: "/dashboard/workspaces/new" },
    { done: openRequests > 0 || workspaces.some((w) => w.documentCount > 0), label: "Demander des pièces ou déposer un document", href: workspaces[0] ? `/dashboard/workspaces/${workspaces[0].id}` : "/dashboard/workspaces/new" },
    { done: shared > 0, label: "Envoyer le lien du portail à votre client", href: workspaces[0] ? `/dashboard/workspaces/${workspaces[0].id}?tab=partage` : "/dashboard/workspaces/new" },
  ];
  const onboarding = steps.some((s) => !s.done);
  const recentSpaces = [...workspaces]
    .filter((w) => w.status !== "archived")
    .sort((a, b) => (b.lastActivityAt ?? b.updated_at).localeCompare(a.lastActivityAt ?? a.updated_at))
    .slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
            {greeting()}{firstName ? ` ${firstName}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {actions.length > 0
              ? `${actions.length} élément${actions.length > 1 ? "s" : ""} attend${actions.length > 1 ? "ent" : ""} votre attention.`
              : "Tout est à jour. Voici l'essentiel de vos dossiers."}
          </p>
        </div>
        {/* Sur grand écran, l'action vit déjà dans le menu latéral. */}
        <Button asChild className="lg:hidden">
          <Link href="/dashboard/workspaces/new">
            <Plus className="h-4 w-4" />
            {vocab.newLabel}
          </Link>
        </Button>
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground sm:text-sm">{k.label}</p>
                <span className={cn("hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex", k.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:mt-2 sm:text-3xl">{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Premiers pas */}
      {onboarding && (
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-subtle via-white to-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Premiers pas — votre premier dossier en 3 minutes
          </p>
          <ol className="mt-3 grid gap-2 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={cn(
                    "flex h-full items-center gap-3 rounded-xl border bg-white px-3.5 py-3 text-sm transition-colors",
                    s.done ? "border-emerald-200 text-muted-foreground" : "border-border hover:border-primary/40"
                  )}
                >
                  {s.done ? (
                    <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 text-[10px] font-bold text-primary">{i + 1}</span>
                  )}
                  <span className={cn("font-medium", s.done && "line-through decoration-muted-foreground/40")}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* À traiter + activité */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              À traiter
              {actions.length > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">{actions.length}</span>
              )}
            </h2>
            <span className="text-xs text-muted-foreground">Pièces, validations, retards</span>
          </header>
          <ActionList items={actions} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Activité récente</h2>
            <Link href="/dashboard/notifications" className="text-xs font-medium text-primary hover:underline">
              Tout voir
            </Link>
          </header>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Send className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold">En attente de vos clients</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Ouvertures de portail, dépôts et décisions s&apos;afficheront ici en temps réel.
              </p>
            </div>
          ) : (
            <div className="p-1.5">
              {recent.map((n) => (
                <NotificationRow key={n.id} notification={n} compact />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Espaces récents */}
      {recentSpaces.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Dossiers récents</h2>
            <Link href="/dashboard/workspaces" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Tous les {vocab.plural} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <WorkspacesList workspaces={recentSpaces} usageType={usageType} compact />
        </section>
      )}
    </div>
  );
}
