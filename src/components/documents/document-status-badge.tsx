import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/types/database";

const STATUS_CONFIG: Record<
  DocumentStatus,
  {
    label: string;
    variant: "secondary" | "default" | "warning" | "success" | "destructive" | "outline";
  }
> = {
  draft: { label: "Brouillon", variant: "secondary" },
  sent: { label: "Envoyé", variant: "default" },
  viewed: { label: "Consulté", variant: "warning" },
  downloaded: { label: "Téléchargé", variant: "warning" },
  approved: { label: "Approuvé", variant: "success" },
  rejected: { label: "Refusé", variant: "destructive" },
  archived: { label: "Archivé", variant: "outline" },
};

export const DOCUMENT_STATUS_OPTIONS: {
  value: DocumentStatus;
  label: string;
}[] = (Object.keys(STATUS_CONFIG) as DocumentStatus[]).map((value) => ({
  value,
  label: STATUS_CONFIG[value].label,
}));

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
