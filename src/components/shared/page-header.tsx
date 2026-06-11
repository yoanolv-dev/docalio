import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Lien de retour optionnel affiché au-dessus du titre. */
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel ?? "Retour"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
