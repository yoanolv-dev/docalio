import { Clock } from "lucide-react";
import { DECISION_CONFIG } from "@/components/decisions/decision-badge";

interface DecisionSummaryProps {
  approved: number;
  changesRequested: number;
  rejected: number;
  pending: number;
}

function Tile({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${className}`} />
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Synthèse des décisions client sur les documents visibles du workspace. */
export function DecisionSummary({
  approved,
  changesRequested,
  rejected,
  pending,
}: DecisionSummaryProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Tile label={DECISION_CONFIG.approved.label} value={approved} className="bg-emerald-500" />
      <Tile
        label="Modif. demandées"
        value={changesRequested}
        className="bg-amber-500"
      />
      <Tile label={DECISION_CONFIG.rejected.label} value={rejected} className="bg-red-500" />
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm font-semibold tabular-nums">{pending}</span>
        <span className="text-xs text-muted-foreground">En attente</span>
      </div>
    </div>
  );
}
