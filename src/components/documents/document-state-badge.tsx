import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_STATE_CONFIG,
  type DocumentShareState,
} from "@/lib/document-state";

/** Badge d'état de partage dérivé (visibilité + activité + décision). */
export function DocumentStateBadge({
  state,
  className,
}: {
  state: DocumentShareState;
  className?: string;
}) {
  const config = DOCUMENT_STATE_CONFIG[state];
  const Icon = config.icon;
  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
      title={config.description}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
