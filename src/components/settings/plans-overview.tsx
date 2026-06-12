import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLANS, PLAN_ORDER, formatPlanPrice } from "@/lib/plans";
import type { OrganizationPlan } from "@/lib/types/database";

/**
 * Grille des plans (lecture seule). Le plan courant est mis en avant.
 * Le changement de plan en self-service arrivera avec la facturation : aucune
 * action de paiement ici (architecture compatible Stripe plus tard).
 */
export function PlansOverview({
  currentPlan,
}: {
  currentPlan: OrganizationPlan;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlan;
          return (
            <Card
              key={id}
              className={cn(
                "flex flex-col gap-4 p-5",
                isCurrent && "border-primary ring-1 ring-primary"
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{plan.name}</h3>
                  {isCurrent && <Badge>Plan actuel</Badge>}
                </div>
                <p className="text-lg font-semibold tracking-tight">
                  {formatPlanPrice(plan)}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {plan.tagline}
                </p>
              </div>

              <ul className="space-y-1.5">
                {plan.highlights.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Le changement de plan en self-service arrivera avec la facturation. Pour
        ajuster votre offre dès maintenant, contactez-nous.
      </p>
    </div>
  );
}
