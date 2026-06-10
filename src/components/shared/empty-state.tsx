import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[--color-border] bg-[--color-muted]/30 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[--color-muted]">
        <Icon className="h-5 w-5 text-[--color-muted-foreground]" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-[--color-muted-foreground]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
