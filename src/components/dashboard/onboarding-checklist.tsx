import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingProgress } from "@/lib/onboarding";

interface Step {
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
}

/**
 * Guide « première valeur » : 5 étapes pour qu'un nouvel utilisateur comprenne
 * Docalio en quelques minutes. Affiché tant que le parcours n'est pas terminé.
 */
export function OnboardingChecklist({
  progress,
}: {
  progress: OnboardingProgress;
}) {
  const wsHref = progress.latestWorkspaceId
    ? `/dashboard/workspaces/${progress.latestWorkspaceId}`
    : "/dashboard/workspaces";

  const steps: Step[] = [
    {
      label: "Créez un espace client",
      description: "Un dossier privé par client ou projet.",
      done: progress.hasWorkspace,
      href: "/dashboard/workspaces/new",
      cta: "Créer un espace",
    },
    {
      label: "Ajoutez un document",
      description: "Devis, contrat, rapport… vos fichiers sensibles.",
      done: progress.hasDocument,
      href: wsHref,
      cta: "Ajouter un document",
    },
    {
      label: "Générez un lien de portail",
      description: "Un accès sécurisé, sans compte pour votre client.",
      done: progress.hasPortalLink,
      href: wsHref,
      cta: "Générer le lien",
    },
    {
      label: "Partagez et suivez l'activité",
      description: "Ouvertures et téléchargements en temps réel.",
      done: progress.hasActivity,
      href: wsHref,
      cta: "Voir l'espace",
    },
    {
      label: "Recueillez une décision",
      description: "Validation, modification ou refus, commentés.",
      done: progress.hasDecision,
      href: wsHref,
      cta: "Voir l'espace",
    },
  ];

  const nextStep = steps.find((s) => !s.done);
  const pct = Math.round((progress.completed / progress.total) * 100);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-primary-subtle/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Prenez Docalio en main</h2>
          </div>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {progress.completed}/{progress.total}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cinq étapes pour transformer un dossier en expérience client suivie.
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="divide-y divide-border">
        {steps.map((s, i) => {
          const isNext = nextStep === s;
          return (
            <li
              key={s.label}
              className={cn(
                "flex items-center gap-3 p-4",
                isNext && "bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  s.done
                    ? "bg-primary text-primary-foreground"
                    : isNext
                      ? "border-2 border-primary text-primary"
                      : "border border-border text-muted-foreground"
                )}
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    s.done && "text-muted-foreground line-through"
                  )}
                >
                  {s.label}
                </p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              {isNext && (
                <Button size="sm" asChild className="shrink-0">
                  <Link href={s.href}>
                    {s.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
