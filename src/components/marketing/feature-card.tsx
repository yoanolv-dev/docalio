import type { LucideIcon } from "lucide-react";

export function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
