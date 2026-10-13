import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { fileKind, type FileKind } from "@/lib/files";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<FileKind, { icon: LucideIcon; className: string }> = {
  pdf: { icon: FileText, className: "bg-red-50 text-red-600" },
  image: { icon: FileImage, className: "bg-violet-50 text-violet-600" },
  video: { icon: FileVideo, className: "bg-pink-50 text-pink-600" },
  audio: { icon: FileAudio, className: "bg-fuchsia-50 text-fuchsia-600" },
  text: { icon: FileText, className: "bg-slate-100 text-slate-600" },
  doc: { icon: FileText, className: "bg-blue-50 text-blue-600" },
  sheet: { icon: FileSpreadsheet, className: "bg-emerald-50 text-emerald-600" },
  slides: { icon: Presentation, className: "bg-orange-50 text-orange-600" },
  archive: { icon: FileArchive, className: "bg-amber-50 text-amber-700" },
  code: { icon: FileCode, className: "bg-cyan-50 text-cyan-700" },
  other: { icon: File, className: "bg-slate-100 text-slate-500" },
};

const SIZES = {
  sm: { box: "h-7 w-7 rounded-md", icon: "h-4 w-4" },
  md: { box: "h-9 w-9 rounded-lg", icon: "h-[18px] w-[18px]" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6" },
};

/** Icône d'un élément du Drive : dossier, ou fichier coloré selon son type. */
export function ItemIcon({
  kind,
  name = "",
  mime,
  size = "md",
  className,
}: {
  kind: "folder" | "file";
  name?: string;
  mime?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  if (kind === "folder") {
    return (
      <span className={cn("flex shrink-0 items-center justify-center bg-sky-50 text-sky-600", s.box, className)}>
        <Folder className={cn(s.icon, "fill-sky-500/25")} />
      </span>
    );
  }
  const style = KIND_STYLE[fileKind(name, mime)];
  const Icon = style.icon;
  return (
    <span className={cn("flex shrink-0 items-center justify-center", style.className, s.box, className)}>
      <Icon className={s.icon} />
    </span>
  );
}
