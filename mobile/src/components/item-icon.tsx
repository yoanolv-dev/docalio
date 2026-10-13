import { View } from "react-native";
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
} from "lucide-react-native";
import { fileKind, type FileKind } from "~/lib/shared";

// Mêmes couleurs que le site (src/components/drive/item-icon.tsx).
const KIND_STYLE: Record<FileKind, { icon: LucideIcon; bg: string; fg: string }> = {
  pdf: { icon: FileText, bg: "#fef2f2", fg: "#dc2626" },
  image: { icon: FileImage, bg: "#f5f3ff", fg: "#7c3aed" },
  video: { icon: FileVideo, bg: "#fdf2f8", fg: "#db2777" },
  audio: { icon: FileAudio, bg: "#fdf4ff", fg: "#c026d3" },
  text: { icon: FileText, bg: "#f1f5f9", fg: "#475569" },
  doc: { icon: FileText, bg: "#eff6ff", fg: "#2563eb" },
  sheet: { icon: FileSpreadsheet, bg: "#ecfdf5", fg: "#059669" },
  slides: { icon: Presentation, bg: "#fff7ed", fg: "#ea580c" },
  archive: { icon: FileArchive, bg: "#fffbeb", fg: "#b45309" },
  code: { icon: FileCode, bg: "#ecfeff", fg: "#0e7490" },
  other: { icon: File, bg: "#f1f5f9", fg: "#64748b" },
};

export function ItemIcon({
  kind,
  name = "",
  mime,
  size = 44,
}: {
  kind: "folder" | "file";
  name?: string;
  mime?: string | null;
  size?: number;
}) {
  const box = { width: size, height: size, borderRadius: size * 0.28, alignItems: "center" as const, justifyContent: "center" as const };
  if (kind === "folder") {
    return (
      <View style={[box, { backgroundColor: "#f0f9ff" }]}>
        <Folder size={size * 0.5} color="#0284c7" fill="rgba(14,165,233,0.25)" />
      </View>
    );
  }
  const s = KIND_STYLE[fileKind(name, mime)];
  const Icon = s.icon;
  return (
    <View style={[box, { backgroundColor: s.bg }]}>
      <Icon size={size * 0.5} color={s.fg} />
    </View>
  );
}
