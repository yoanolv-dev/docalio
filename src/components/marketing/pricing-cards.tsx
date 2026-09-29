"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLANS, PLAN_ORDER, formatPlanPrice } from "@/lib/plans";
import type { OrganizationPlan } from "@/lib/types/database";

export function PricingCards({
  plans = PLAN_ORDER,
  highlight = "business",
}: {
  plans?: OrganizationPlan[];
  highlight?: OrganizationPlan;
}) {
  const [yearly, setYearly] = useState(true);

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Période de facturation"
          className="inline-flex items-center rounded-full border border-border bg-card p-1 text-sm shadow-sm"
        >
          {[
            { v: false, label: "Mensuel" },
            { v: true, label: "Annuel" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={yearly === o.v}
              onClick={() => setYearly(o.v)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors",
                yearly === o.v
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
              {o.v && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    yearly
                      ? "bg-background/20 text-background"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  )}
                >
                  2 mois offerts
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-5",
          plans.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"
        )}
      >
        {plans.map((id) => {
          const plan = PLANS[id];
          const isHighlight = id === highlight;
          const isEnterprise = id === "enterprise";
          const price = yearly ? plan.priceYearlyEur : plan.priceEur;
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-6 transition-shadow",
                isHighlight
                  ? "border-primary shadow-[0_24px_60px_-30px_rgba(37,99,235,0.55)] ring-1 ring-primary"
                  : "border-border hover:shadow-md"
              )}
            >
              {isHighlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm">
                  Le plus choisi
                </span>
              )}
              <h3 className="text-sm font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1">
                {price === null ? (
                  <span className="text-3xl font-semibold tracking-tight">Sur devis</span>
                ) : price === 0 ? (
                  <span className="text-4xl font-semibold tracking-tight">0 €</span>
                ) : (
                  <>
                    <span className="text-4xl font-semibold tracking-tight tabular-nums">
                      {price} €
                    </span>
                    <span className="text-sm text-muted-foreground">HT/mois</span>
                  </>
                )}
              </div>
              <p className="mt-1 h-4 text-xs text-muted-foreground">
                {price === 0
                  ? "Gratuit, sans limite de durée"
                  : price !== null && yearly && plan.priceEur
                    ? `soit ${price * 12} € HT/an au lieu de ${plan.priceEur * 12} €`
                    : price !== null
                      ? "Sans engagement"
                      : ""}
              </p>

              <Button
                className="mt-5"
                variant={isHighlight ? "default" : "outline"}
                asChild
              >
                <Link href={isEnterprise ? "/contact" : "/register"}>
                  {isEnterprise
                    ? "Parler à l'équipe"
                    : plan.priceEur === 0
                      ? "Créer mon compte"
                      : "Essayer 14 jours"}
                </Link>
              </Button>

              <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-5">
                {plan.highlights.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{line}</span>
                  </li>
                ))}
              </ul>
              <p className="sr-only">{formatPlanPrice(plan)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
