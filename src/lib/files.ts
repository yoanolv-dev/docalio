// Règles fichiers du module Documents (V1).
// Partagé entre la validation client (feedback immédiat) et serveur (autorité).

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

/** Taille lisible : 1.2 Mo, 540 Ko... */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
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

/** Message d'erreur de validation, ou null si le fichier est accepté. */
export function validateFile(file: {
  name: string;
  size: number;
}): string | null {
  const ext = getFileExtension(file.name);
  if (!isAcceptedExtension(ext)) {
    return `Format non supporté. Formats acceptés : ${ACCEPTED_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")}.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Fichier trop volumineux (${formatBytes(file.size)}). Maximum : ${MAX_FILE_SIZE_MB} Mo.`;
  }
  if (file.size === 0) {
    return "Le fichier est vide.";
  }
  return null;
}
