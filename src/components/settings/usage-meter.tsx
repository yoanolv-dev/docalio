import { cn } from "@/lib/utils";
import { usagePercent } from "@/lib/plans";

interface UsageMeterProps {
  label: string;
  /** Valeur utilisée (brute, pour le calcul du pourcentage). */
  used: number;
  /** Limite du plan (`null` = illimité). */
  limit: number | null;
  /** Libellé formaté de la valeur utilisée ("1.2 Go", "3"...). */
  usedLabel: string;
  /** Libellé formaté de la limite ("10 Go", "Illimité"...). */
  limitLabel: string;
}

/**
 * Barre d'utilisation d'un quota (server component, sans interactivité).
 * Vire à l'ambre dès 80 %, au rouge à 100 %.
 */
export function UsageMeter({
  label,
  used,
  limit,
  usedLabel,
  limitLabel,
}: UsageMeterProps) {
  const unlimited = limit === null;
  const percent = usagePercent(used, limit);
  const reached = !unlimited && percent >= 100;
  const near = !unlimited && percent >= 80 && percent < 100;

  const barColor = reached
    ? "bg-red-500"
    : near
      ? "bg-amber-500"
      : "bg-primary";

  // Largeur affichée : pleine et atténuée si illimité ; sinon le pourcentage
  // réel, avec un minimum visible dès qu'il y a de la consommation.
  const width = unlimited ? 100 : used > 0 ? Math.max(percent, 3) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {usedLabel}
          <span className="text-muted-foreground/60"> / {limitLabel}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            unlimited ? "bg-primary/20" : barColor
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      {reached && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">
          Limite atteinte
        </p>
      )}
      {near && (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Bientôt atteinte
        </p>
      )}
    </div>
  );
}
