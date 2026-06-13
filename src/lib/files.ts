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
