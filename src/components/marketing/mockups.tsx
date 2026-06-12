import {
  Bell,
  Check,
  CheckCircle,
  CircleCheck,
  CloudUpload,
  Copy,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  Link2,
  Mail,
  Paperclip,
  PencilLine,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// Mockups produit — mises en scène 100 % HTML/CSS du vrai produit.
// Aucune image, aucun logo client, aucune statistique inventée : un scénario
// fictif assumé (Agence Lumen × Garage Martin) qui montre le produit réel.
// =============================================================================

/** Chrome navigateur autour d'un écran produit. */
export function MockWindow({
  url,
  children,
  className,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-slate-900/5",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

function MockDocRow({
  icon: Icon,
  iconClass,
  title,
  meta,
  badge,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  meta: string;
  badge?: {
    label: string;
    variant: "success" | "warning" | "info" | "default";
    icon: LucideIcon;
  };
}) {
  const BadgeIcon = badge?.icon;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          iconClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      {badge && BadgeIcon && (
        <Badge variant={badge.variant} className="hidden shrink-0 sm:inline-flex">
          <BadgeIcon className="h-3 w-3" />
          {badge.label}
        </Badge>
      )}
    </div>
  );
}

/** Portail client vu par le client final — l'écran signature de Docalio. */
export function MockPortal() {
  return (
    <div className="bg-muted/30">
      <div aria-hidden className="h-1 bg-primary" />
      <div className="p-5 sm:p-6">
        {/* En-tête de marque */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              AL
            </div>
            <div>
              <p className="text-sm font-semibold">Agence Lumen</p>
              <p className="text-xs text-muted-foreground">
                Espace documentaire
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Accès sécurisé
          </span>
        </div>

        <h3 className="mt-4 text-base font-semibold tracking-tight sm:text-lg">
          Refonte du site — Garage Martin
        </h3>

        {/* Progression du dossier */}
        <div className="mt-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Avancement du dossier</span>
            <span className="text-muted-foreground">2/3 traités</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
        </div>

        {/* Documents */}
        <div className="mt-3 space-y-2">
          <MockDocRow
            icon={FileText}
            iconClass="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
            title="Proposition commerciale.pdf"
            meta="PDF · 1,4 Mo"
            badge={{ label: "Approuvé", variant: "success", icon: CheckCircle }}
          />
          <MockDocRow
            icon={FileSpreadsheet}
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            title="Planning projet.xlsx"
            meta="Excel · 96 Ko"
            badge={{
              label: "Modification demandée",
              variant: "warning",
              icon: PencilLine,
            }}
          />
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  Contrat de prestation.pdf
                </p>
                <p className="text-xs text-muted-foreground">PDF · 820 Ko</p>
              </div>
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            {/* Décision attendue */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                Votre décision :
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CircleCheck className="h-3 w-3" />
                Approuver
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <PencilLine className="h-3 w-3" />
                Modifier
              </span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Accès sécurisé — aucun compte requis
        </p>
      </div>
    </div>
  );
}

/** Notification temps réel côté équipe (carte flottante du hero). */
export function MockNotification({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-lg shadow-slate-900/10",
        className
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <Download className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold">Contrat téléchargé</p>
        <p className="text-[11px] text-muted-foreground">
          Garage Martin · à l&apos;instant
        </p>
      </div>
      <Bell className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </div>
  );
}

/** Décision client reçue (carte flottante du hero). */
export function MockDecisionToast({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-lg shadow-slate-900/10",
        className
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary">
        <CircleCheck className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold">Proposition approuvée</p>
        <p className="text-[11px] text-muted-foreground">
          « Parfait pour nous, allons-y »
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Étapes du parcours produit (section « le flux Docalio »)
// -----------------------------------------------------------------------------

/** Étape 1 — créer un espace client. */
export function MockCreateSpace() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold">Nouvel espace client</p>
      <div className="mt-3 space-y-2.5">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground">
            Nom de l&apos;espace
          </p>
          <div className="mt-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs">
            Refonte du site — Garage Martin
          </div>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground">
            Société cliente
          </p>
          <div className="mt-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs">
            Garage Martin
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm">
          Créer l&apos;espace
        </div>
      </div>
    </div>
  );
}

/** Étape 2 — déposer des documents (drag & drop). */
export function MockUpload() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary-subtle/40 px-4 py-5 text-xs font-medium text-primary">
        <CloudUpload className="h-4 w-4" />
        Déposez vos fichiers ici
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-xs font-medium">
            Contrat de prestation.pdf
          </p>
          <span className="text-[10px] text-muted-foreground">Envoi…</span>
        </div>
        <div className="h-0.5 w-full overflow-hidden bg-primary-subtle">
          <div className="h-full w-1/3 rounded-full bg-primary animate-progress-slide" />
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 truncate text-xs font-medium">
          Proposition commerciale.pdf
        </p>
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      </div>
    </div>
  );
}

/** Étape 3 — partager le portail (lien sécurisé). */
export function MockShare() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Portail client</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Lien actif
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
          <Link2 className="h-3 w-3 shrink-0" />
          <span className="truncate">docalio.app/p/d8f3a1•••</span>
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card">
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </div>
      <p className="mt-2.5 text-[11px] text-muted-foreground">
        Expirable, révocable, sans compte pour votre client.
      </p>
    </div>
  );
}

/** Étape 4 — suivre l'activité réelle. */
export function MockActivity() {
  const events = [
    {
      icon: Eye,
      tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
      label: "Portail ouvert",
      time: "Il y a 2 h",
    },
    {
      icon: FileText,
      tone: "bg-muted text-muted-foreground",
      label: "Proposition consultée",
      time: "Il y a 2 h",
    },
    {
      icon: Download,
      tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      label: "Contrat téléchargé",
      time: "Il y a 1 h",
    },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold">Activité client</p>
      <ul className="mt-3 space-y-2">
        {events.map((e) => {
          const Icon = e.icon;
          return (
            <li key={e.label} className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  e.tone
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="min-w-0 flex-1 truncate text-xs">{e.label}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {e.time}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Étape 5 — recevoir la décision + relance prête à envoyer. */
export function MockDecision() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="text-xs font-semibold">
            Proposition commerciale approuvée
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            « Parfait pour nous, allons-y »
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Send className="h-3 w-3" />
          Relance recommandée
        </p>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
          « Bonjour, merci pour votre validation concernant la refonte du site.
          Nous enchaînons sur les prochaines étapes… »
        </p>
        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-primary">
          <Copy className="h-3 w-3" />
          Copier le message
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Avant / Après
// -----------------------------------------------------------------------------

/** « Avant » : le fil d'emails qui part dans tous les sens. */
export function MockEmailChaos() {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <p className="truncate text-xs font-semibold text-muted-foreground">
          RE: RE: TR: Documents projet — v3 (encore)
        </p>
      </div>
      <div className="rounded-lg bg-muted/60 p-2.5">
        <p className="text-[11px] font-medium">Vous → client, lundi</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Voici les documents en pièce jointe…
        </p>
        <span className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-md border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
          <Paperclip className="h-3 w-3 shrink-0" />
          contrat_v3_FINAL(2).pdf
        </span>
      </div>
      <div className="rounded-lg bg-muted/60 p-2.5">
        <p className="text-[11px] font-medium">Vous → client, jeudi</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Avez-vous pu regarder les documents ?
        </p>
      </div>
      <div className="rounded-lg bg-muted/60 p-2.5">
        <p className="text-[11px] font-medium">Client → vous, la semaine d&apos;après</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Je ne retrouve plus la dernière version, vous pouvez renvoyer ?
        </p>
      </div>
      <p className="pt-1 text-center text-[10px] text-muted-foreground">
        Aucune visibilité · versions perdues · relances à l&apos;aveugle
      </p>
    </div>
  );
}

/** « Après » : l'espace Docalio, suivi et actionnable. */
export function MockPortalMini() {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground">
            AL
          </div>
          <p className="text-xs font-semibold">Un seul espace, toujours à jour</p>
        </div>
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <MockDocRow
        icon={FileText}
        iconClass="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
        title="Contrat de prestation.pdf"
        meta="Téléchargé il y a 1 h"
        badge={{ label: "Téléchargé", variant: "info", icon: Download }}
      />
      <MockDocRow
        icon={FileText}
        iconClass="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
        title="Proposition commerciale.pdf"
        meta="Décision reçue hier"
        badge={{ label: "Approuvé", variant: "success", icon: CheckCircle }}
      />
      <p className="pt-1 text-center text-[10px] text-muted-foreground">
        Vu, téléchargé, décidé : vous savez tout, au bon moment
      </p>
    </div>
  );
}
