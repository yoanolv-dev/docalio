import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLANS, PLAN_ORDER, formatPlanPrice } from "@/lib/plans";
import type { OrganizationPlan } from "@/lib/types/database";

export function PricingCards({
  plans = PLAN_ORDER,
  highlight = "pro",
}: {
  plans?: OrganizationPlan[];
  highlight?: OrganizationPlan;
}) {
  return (
    <div
      className={cn(
        "grid gap-5",
        plans.length >= 4
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : "sm:grid-cols-3"
      )}
    >
      {plans.map((id) => {
        const plan = PLANS[id];
        const isHighlight = id === highlight;
        const isEnterprise = id === "enterprise";
        return (
          <div
            key={id}
            className={cn(
              "flex flex-col rounded-2xl border bg-card p-6",
              isHighlight
                ? "border-primary shadow-lg shadow-primary/5 ring-1 ring-primary"
                : "border-border"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{plan.name}</h3>
              {isHighlight && <Badge>Populaire</Badge>}
            </div>

            <div className="mt-3 flex items-baseline gap-1">
              {plan.priceEur === null ? (
                <span className="text-2xl font-semibold tracking-tight">
                  Sur devis
                </span>
              ) : (
                <>
                  <span className="text-3xl font-semibold tracking-tight">
                    {plan.priceEur} €
                  </span>
                  <span className="text-sm text-muted-foreground">/mois</span>
                </>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.highlights.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-6"
              variant={isHighlight ? "default" : "outline"}
              asChild
            >
              <Link href={isEnterprise ? "/contact" : "/register"}>
                {isEnterprise ? "Nous contacter" : "Démarrer"}
              </Link>
            </Button>
            <p className="sr-only">{formatPlanPrice(plan)}</p>
          </div>
        );
      })}
    </div>
  );
}
