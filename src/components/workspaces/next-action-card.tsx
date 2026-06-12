"use client";

import { useState } from "react";
import {
  Send,
  CheckCircle,
  PencilLine,
  AlertTriangle,
  ListChecks,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextAction, NextActionTone } from "@/lib/next-action";

const TONE: Record<
  NextActionTone,
  { icon: LucideIcon; pill: string; ring: string }
> = {
  neutral: {
    icon: ListChecks,
    pill: "bg-muted text-muted-foreground",
    ring: "border-border",
  },
  info: {
    icon: Send,
    pill: "bg-primary-subtle text-primary",
    ring: "border-primary/20",
  },
  success: {
    icon: CheckCircle,
    pill: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    ring: "border-emerald-200 dark:border-emerald-500/30",
  },
  warning: {
    icon: PencilLine,
    pill: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    ring: "border-amber-200 dark:border-amber-500/30",
  },
  attention: {
    icon: AlertTriangle,
    pill: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    ring: "border-red-200 dark:border-red-500/30",
  },
};

export function NextActionCard({ action }: { action: NextAction }) {
  const [copied, setCopied] = useState(false);
  const tone = TONE[action.tone];
  const Icon = tone.icon;

  async function copy() {
    if (!action.message) return;
    try {
      await navigator.clipboard.writeText(action.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (navigateur restreint) : on ignore.
    }
  }

  return (
    <div className={cn("rounded-xl border bg-card p-5", tone.ring)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tone.pill
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {action.title}
          </p>
          <p className="mt-0.5 text-sm font-semibold leading-snug">
            {action.headline}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {action.recommendation}
          </p>
        </div>
      </div>

      {action.message && (
        <div className="mt-4">
          <div className="relative rounded-lg border border-border bg-muted/40 p-3">
            <p className="whitespace-pre-line pr-9 text-sm leading-relaxed text-foreground/90">
              {action.message}
            </p>
            <button
              type="button"
              onClick={copy}
              aria-label="Copier le message"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={copy}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Message copié
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copier le message
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
