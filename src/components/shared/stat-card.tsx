import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "default" | "primary" | "success" | "warning";

const TONE_CLASSES: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-subtle text-primary",
  success:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning:
    "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: StatTone;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <Card className={className}>
      <CardContent className="p-5 sm:p-5 sm:pt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              TONE_CLASSES[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                isPositive ? "text-emerald-600" : "text-red-500"
              )}
            >
              {isPositive ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
