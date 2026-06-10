import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
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
  trend,
  className,
}: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[--color-muted-foreground]">
            {label}
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--color-muted]">
            <Icon className="h-4 w-4 text-[--color-muted-foreground]" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
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
