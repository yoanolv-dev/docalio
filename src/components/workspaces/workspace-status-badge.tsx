import { Badge } from "@/components/ui/badge";
import type { WorkspaceStatus } from "@/lib/types/database";

const STATUS_CONFIG: Record<
  WorkspaceStatus,
  { label: string; variant: "warning" | "success" | "secondary" }
> = {
  prospect: { label: "Prospect", variant: "warning" },
  active: { label: "Actif", variant: "success" },
  archived: { label: "Archivé", variant: "secondary" },
};

export const WORKSPACE_STATUS_OPTIONS: { value: WorkspaceStatus; label: string }[] =
  [
    { value: "prospect", label: "Prospect" },
    { value: "active", label: "Actif" },
    { value: "archived", label: "Archivé" },
  ];

export function WorkspaceStatusBadge({ status }: { status: WorkspaceStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.prospect;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
