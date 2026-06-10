import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileExtension } from "@/lib/files";

const EXTENSION_ICONS: Record<string, { icon: LucideIcon; className: string }> =
  {
    pdf: { icon: FileText, className: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400" },
    docx: { icon: FileText, className: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" },
    xlsx: { icon: FileSpreadsheet, className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" },
    pptx: { icon: Presentation, className: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400" },
    png: { icon: FileImage, className: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400" },
    jpg: { icon: FileImage, className: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400" },
    jpeg: { icon: FileImage, className: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400" },
    zip: { icon: FileArchive, className: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" },
  };

/** Icône colorée selon l'extension du fichier (déduite du chemin Storage). */
export function FileIcon({ filePath }: { filePath: string }) {
  const ext = getFileExtension(filePath);
  const config = EXTENSION_ICONS[ext] ?? {
    icon: File,
    className: "bg-[--color-muted] text-[--color-muted-foreground]",
  };
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        config.className
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}
