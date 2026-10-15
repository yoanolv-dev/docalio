// Règles fichiers du Drive.
// Partagé entre la validation client (feedback immédiat) et serveur (autorité).
// Un vrai drive accepte tous les types de fichiers : seule la taille est
// limitée (par le plan de l'organisation, cf. src/lib/plans.ts).

const EXTENSION_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "Word",
  docx: "Word",
  odt: "Writer",
  xls: "Excel",
  xlsx: "Excel",
  ods: "Calc",
  csv: "CSV",
  ppt: "PowerPoint",
  pptx: "PowerPoint",
  odp: "Impress",
  txt: "Texte",
  md: "Markdown",
  rtf: "RTF",
  png: "Image PNG",
  jpg: "Image JPG",
  jpeg: "Image JPEG",
  webp: "Image WebP",
  gif: "Image GIF",
  svg: "Image SVG",
  heic: "Image HEIC",
  tif: "Image TIFF",
  tiff: "Image TIFF",
  bmp: "Image BMP",
  psd: "Photoshop",
  ai: "Illustrator",
  indd: "InDesign",
  fig: "Figma",
  sketch: "Sketch",
  dwg: "AutoCAD",
  dxf: "DXF",
  zip: "Archive ZIP",
  rar: "Archive RAR",
  "7z": "Archive 7z",
  tar: "Archive TAR",
  gz: "Archive GZ",
  mp4: "Vidéo MP4",
  mov: "Vidéo MOV",
  avi: "Vidéo AVI",
  webm: "Vidéo WebM",
  mkv: "Vidéo MKV",
  mp3: "Audio MP3",
  wav: "Audio WAV",
  m4a: "Audio M4A",
  ogg: "Audio OGG",
  eml: "E-mail",
  msg: "E-mail",
  json: "JSON",
  xml: "XML",
  html: "HTML",
  key: "Keynote",
  pages: "Pages",
  numbers: "Numbers",
};

/**
 * Tous les types de fichiers sont acceptés (`accept` absent des inputs).
 * Conservé pour compatibilité avec les inputs existants.
 */
export const FILE_ACCEPT_ATTRIBUTE: string | undefined = undefined;

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx + 1).toLowerCase();
}

/** Libellé lisible du type de fichier ("PDF", "Word", "Vidéo MP4"…). */
export function fileTypeLabel(ext: string): string {
  if (!ext) return "Fichier";
  return EXTENSION_LABELS[ext] ?? ext.toUpperCase();
}

const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "text/csv": "csv",
  "text/plain": "txt",
  "text/markdown": "md",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/heic": "heic",
  "image/tiff": "tiff",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/x-rar-compressed": "rar",
  "application/x-7z-compressed": "7z",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/mp4": "m4a",
};

/** Déduit une extension connue à partir d'un type MIME (pour l'affichage). */
export function extensionFromMime(mime: string | null | undefined): string {
  if (!mime) return "";
  return MIME_TO_EXTENSION[mime] ?? "";
}

/** Catégorie d'aperçu : pilote la visionneuse intégrée. */
export type PreviewKind = "image" | "pdf" | "video" | "audio" | "text" | "none";

export function previewKind(
  fileName: string,
  mime?: string | null
): PreviewKind {
  const ext = getFileExtension(fileName) || extensionFromMime(mime);
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) {
    return "image";
  }
  if (ext === "pdf") return "pdf";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (["txt", "md", "csv", "json", "xml"].includes(ext)) return "text";
  return "none";
}

/** Taille lisible : 1.4 Go, 1.2 Mo, 540 Ko... (sans « .0 » superflu). */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${trimZero(bytes / (1024 * 1024))} Mo`;
  }
  return `${trimZero(bytes / (1024 * 1024 * 1024))} Go`;
}

/** Une décimale, sans « .0 » inutile (1 → "1", 1.2 → "1.2"). */
function trimZero(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Assainit un nom de fichier pour le chemin Storage :
 * accents retirés, caractères spéciaux remplacés, longueur bornée,
 * extension préservée. Empêche tout path traversal.
 */
export function sanitizeFileName(fileName: string): string {
  const ext = getFileExtension(fileName);
  const base = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;
  const safeBase =
    base
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "document";
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 10);
  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

/**
 * Chemin Storage canonique d'un document dans le bucket privé.
 * Forme : organizations/{org}/workspaces/{ws}/{documentId}-{safeName}
 */
export function formatStoragePath(
  organizationId: string,
  workspaceId: string,
  documentId: string,
  safeName: string
): string {
  return `organizations/${organizationId}/workspaces/${workspaceId}/${documentId}-${safeName}`;
}

/**
 * Message d'erreur de validation, ou null si le fichier est accepté.
 * `maxBytes` = taille max autorisée par le plan de l'organisation.
 */
export function validateFile(
  file: { name: string; size: number },
  maxBytes: number
): string | null {
  if (file.size === 0) {
    return "Le fichier est vide.";
  }
  if (file.size > maxBytes) {
    return `Fichier trop volumineux (${formatBytes(file.size)}). Maximum autorisé par votre plan : ${formatBytes(maxBytes)}.`;
  }
  return null;
}
