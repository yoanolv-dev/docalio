// Règles fichiers du module Documents.
// Partagé entre la validation client (feedback immédiat) et serveur (autorité).
// La taille maximale par fichier dépend du plan (cf. src/lib/plans.ts) et est
// transmise explicitement à `validateFile`.

export type AcceptedExtension =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "png"
  | "jpg"
  | "jpeg"
  | "zip";

const EXTENSION_LABELS: Record<AcceptedExtension, string> = {
  pdf: "PDF",
  docx: "Word",
  xlsx: "Excel",
  pptx: "PowerPoint",
  png: "Image PNG",
  jpg: "Image JPG",
  jpeg: "Image JPEG",
  zip: "Archive ZIP",
};

export const ACCEPTED_EXTENSIONS = Object.keys(
  EXTENSION_LABELS
) as AcceptedExtension[];

/** Valeur de l'attribut `accept` des inputs fichier. */
export const FILE_ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map(
  (ext) => `.${ext}`
).join(",");

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx + 1).toLowerCase();
}

export function isAcceptedExtension(ext: string): ext is AcceptedExtension {
  return (ACCEPTED_EXTENSIONS as string[]).includes(ext);
}

/** Libellé lisible du type de fichier ("PDF", "Word"...). */
export function fileTypeLabel(ext: string): string {
  return isAcceptedExtension(ext) ? EXTENSION_LABELS[ext] : ext.toUpperCase();
}

const MIME_TO_EXTENSION: Record<string, AcceptedExtension> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-powerpoint": "pptx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

/** Déduit une extension connue à partir d'un type MIME (pour l'affichage). */
export function extensionFromMime(mime: string | null | undefined): string {
  if (!mime) return "";
  return MIME_TO_EXTENSION[mime] ?? "";
}

/** Taille lisible : 1.4 Go, 1.2 Mo, 540 Ko... (sans « .0 » superflu). */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "-";
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
  return ext ? `${safeBase}.${ext}` : safeBase;
}

/**
 * Chemin Storage canonique d'un document dans le bucket privé.
 * Forme : organizations/{org}/workspaces/{ws}/{documentId}-{safeName}
 * Construit exclusivement côté serveur (empêche tout path traversal).
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
  const ext = getFileExtension(file.name);
  if (!isAcceptedExtension(ext)) {
    return `Format non supporté. Formats acceptés : ${ACCEPTED_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")}.`;
  }
  if (file.size === 0) {
    return "Le fichier est vide.";
  }
  if (file.size > maxBytes) {
    return `Fichier trop volumineux (${formatBytes(file.size)}). Maximum autorisé par votre plan : ${formatBytes(maxBytes)}.`;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Drive : tous les types de fichiers sont acceptés (comme un Drive classique).
// Les règles ci-dessous servent à l'affichage (icône, aperçu) et aux noms.
// -----------------------------------------------------------------------------

export type FileKind =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "text"
  | "doc"
  | "sheet"
  | "slides"
  | "archive"
  | "code"
  | "other";

const KIND_BY_EXTENSION: Record<string, FileKind> = {
  pdf: "pdf",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image",
  svg: "image", bmp: "image", heic: "image", heif: "image", avif: "image", tif: "image", tiff: "image",
  mp4: "video", mov: "video", webm: "video", m4v: "video", avi: "video", mkv: "video",
  mp3: "audio", wav: "audio", m4a: "audio", ogg: "audio", flac: "audio", aac: "audio",
  txt: "text", md: "text", csv: "sheet", log: "text", rtf: "doc",
  doc: "doc", docx: "doc", odt: "doc", pages: "doc",
  xls: "sheet", xlsx: "sheet", ods: "sheet", numbers: "sheet",
  ppt: "slides", pptx: "slides", odp: "slides", key: "slides",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  json: "code", xml: "code", html: "code", css: "code", js: "code", ts: "code",
  py: "code", sql: "code", yml: "code", yaml: "code",
};

/** Famille d'un fichier, déduite de son extension puis de son type MIME. */
export function fileKind(name: string, mime?: string | null): FileKind {
  const byExt = KIND_BY_EXTENSION[getFileExtension(name)];
  if (byExt) return byExt;
  if (!mime) return "other";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

/** Aperçus pris en charge dans le navigateur, sans service tiers. */
export type PreviewKind = "image" | "pdf" | "video" | "audio" | "text";

const BROWSER_IMAGES = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"]);
const BROWSER_VIDEOS = new Set(["mp4", "webm", "mov", "m4v"]);
const BROWSER_AUDIOS = new Set(["mp3", "wav", "m4a", "ogg", "aac", "flac"]);
const TEXT_PREVIEW_MAX_BYTES = 2 * 1024 * 1024;

export function previewKind(
  name: string,
  mime: string | null | undefined,
  size: number | null | undefined
): PreviewKind | null {
  const ext = getFileExtension(name);
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (BROWSER_IMAGES.has(ext)) return "image";
  if (BROWSER_VIDEOS.has(ext)) return "video";
  if (BROWSER_AUDIOS.has(ext)) return "audio";
  if (["txt", "md", "csv", "log", "json", "xml", "yml", "yaml"].includes(ext)) {
    return (size ?? 0) <= TEXT_PREVIEW_MAX_BYTES ? "text" : null;
  }
  return null;
}

/** Libellé court du type (« PDF », « Image », « Tableur »…). */
export function fileKindLabel(name: string, mime?: string | null): string {
  const ext = getFileExtension(name);
  switch (fileKind(name, mime)) {
    case "pdf":
      return "PDF";
    case "image":
      return `Image ${ext.toUpperCase()}`.trim();
    case "video":
      return "Vidéo";
    case "audio":
      return "Audio";
    case "text":
      return "Texte";
    case "doc":
      return "Document";
    case "sheet":
      return "Tableur";
    case "slides":
      return "Présentation";
    case "archive":
      return "Archive";
    case "code":
      return ext.toUpperCase();
    default:
      return ext ? ext.toUpperCase() : "Fichier";
  }
}

/** Sépare « Contrat final.pdf » en { base: « Contrat final », ext: « pdf » }. */
export function splitFileName(name: string): { base: string; ext: string } {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return { base: name, ext: "" };
  return { base: name.slice(0, idx), ext: name.slice(idx + 1) };
}

/**
 * Premier nom libre dans un dossier : « Contrat.pdf », puis « Contrat (1).pdf »,
 * « Contrat (2).pdf »… (comparaison insensible à la casse).
 */
export function uniqueFileName(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((n) => n.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  const { base, ext } = splitFileName(name);
  for (let i = 1; i < 10_000; i++) {
    const candidate = ext ? `${base} (${i}).${ext}` : `${base} (${i})`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now()}${ext ? `.${ext}` : ""}`;
}

/** Nom de fichier ou de dossier saisi par l'utilisateur : ni « / » ni retours. */
export function cleanItemName(raw: string, max = 255): string {
  return raw.replace(/[/\\\r\n\t]/g, "-").trim().slice(0, max);
}

/**
 * Validation Drive : tous les formats sont acceptés, seule la taille compte.
 * `maxBytes` = taille max du forfait, bornée par l'hébergement.
 */
export function validateDriveFile(
  file: { name: string; size: number },
  maxBytes: number
): string | null {
  if (file.size === 0) return "Le fichier est vide.";
  if (file.size > maxBytes) {
    return `Fichier trop volumineux (${formatBytes(file.size)}). Maximum : ${formatBytes(maxBytes)} par fichier.`;
  }
  return null;
}
