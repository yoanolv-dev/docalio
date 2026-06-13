import {
  Check,
  CircleCheck,
  Eye,
  FileText,
  Send,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Pipeline du dossier : où en est-on, de la préparation à la décision client.
// Entièrement dérivé des données réelles — rien à saisir.

export interface WorkspacePipelineInput {
  documentCount: number;
  visibleCount: number;
  hasActiveLink: boolean;
  opens: number;
  decidedCount: number;
  /** Documents visibles sans décision. */
  pendingCount: number;
}

type StepStatus = "done" | "current" | "upcoming";

interface Step {
  label: string;
  caption: string;
  icon: LucideIcon;
  done: boolean;
}

function buildSteps(input: WorkspacePipelineInput): Step[] {
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;
  return [
    {
      label: "Documents",
      icon: FileText,
      done: input.documentCount > 0,
      caption:
        input.documentCount > 0
          ? plural(input.documentCount, "fichier")
          : "Aucun fichier",
    },
    {
      label: "Partage",
      icon: Send,
      done: input.visibleCount > 0 && input.hasActiveLink,
      caption: input.hasActiveLink
        ? input.visibleCount > 0
          ? `${plural(input.visibleCount, "doc")} · lien actif`
          : "Rien de visible"
        : input.visibleCount > 0
          ? "Lien à créer"
          : "À préparer",
    },
    {
      label: "Consultation",
      icon: Eye,
      done: input.opens > 0,
      caption:
        input.opens > 0 ? plural(input.opens, "ouverture") : "Jamais ouvert",
    },
    {
      label: "Décision",
      icon: CircleCheck,
      done:
        input.visibleCount > 0 &&
        input.pendingCount === 0 &&
        input.decidedCount > 0,
      caption:
        input.decidedCount > 0
          ? `${input.decidedCount}/${input.visibleCount} traités`
          : "En attente",
    },
  ];
}

export function WorkspacePipeline({
  input,
}: {
  input: WorkspacePipelineInput;
}) {
  const steps = buildSteps(input);
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <ol className="grid grid-cols-2 gap-x-2 gap-y-4 sm:flex sm:items-start">
      {steps.map((step, i) => {
        const status: StepStatus = step.done
          ? "done"
          : i === currentIndex
            ? "current"
            : "upcoming";
        const Icon = status === "done" ? Check : step.icon;
        return (
          <li key={step.label} className="flex items-start gap-2.5 sm:flex-1">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                status === "done" &&
                  "bg-primary text-primary-foreground shadow-sm",
                status === "current" &&
                  "border-2 border-primary bg-primary-subtle text-primary",
                status === "upcoming" &&
                  "border border-border bg-card text-muted-foreground/60"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs font-semibold",
                  status === "upcoming" && "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {step.caption}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div
                aria-hidden
                className={cn(
                  "mx-1 mt-4 hidden h-px flex-1 sm:block",
                  step.done ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
