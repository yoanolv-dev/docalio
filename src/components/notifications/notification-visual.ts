import {
  Eye,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  PencilLine,
  type LucideIcon,
} from "lucide-react";
import type { AppNotification } from "@/lib/types/database";

export interface NotificationVisual {
  Icon: LucideIcon;
  /** Classes de la pastille (fond + texte). */
  className: string;
}

const SKY =
  "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400";

/** Icône + teinte d'une notification selon son type / sa décision. */
export function notificationVisual(n: AppNotification): NotificationVisual {
  switch (n.type) {
    case "portal_opened":
      return { Icon: Eye, className: SKY };
    case "document_downloaded":
      return { Icon: Download, className: "bg-primary-subtle text-primary" };
    case "document_opened":
      return { Icon: FileText, className: SKY };
    case "decision_received":
      if (n.metadata.decision === "approved") {
        return {
          Icon: CheckCircle,
          className:
            "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
        };
      }
      if (n.metadata.decision === "rejected") {
        return {
          Icon: XCircle,
          className:
            "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
        };
      }
      return {
        Icon: PencilLine,
        className:
          "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      };
  }
}
