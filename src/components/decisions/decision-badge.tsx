import { CircleCheck, CircleX, PencilLine, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DecisionType } from "@/lib/types/database";

interface DecisionConfig {
  label: string;
  clientLabel: string;
  variant: "success" | "warning" | "destructive";
  icon: LucideIcon;
}

export const DECISION_CONFIG: Record<DecisionType, DecisionConfig> = {
  approved: {
    label: "Approuvé",
    clientLabel: "Vous avez approuvé",
    variant: "success",
    icon: CircleCheck,
  },
  changes_requested: {
    label: "Modification demandée",
    clientLabel: "Vous avez demandé une modification",
    variant: "warning",
    icon: PencilLine,
  },
  rejected: {
    label: "Refusé",
    clientLabel: "Vous avez refusé",
    variant: "destructive",
    icon: CircleX,
  },
};

export function DecisionBadge({ decision }: { decision: DecisionType }) {
  const config = DECISION_CONFIG[decision];
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}
