// Règles métier partagées avec le site web (une seule source de vérité) :
// noms, tailles, familles de fichiers, chemins Storage, forfaits, arborescence.
export {
  cleanItemName,
  fileKind,
  fileKindLabel,
  formatBytes,
  formatStoragePath,
  previewKind,
  sanitizeFileName,
  splitFileName,
  uniqueFileName,
  validateDriveFile,
  type FileKind,
  type PreviewKind,
} from "../../../src/lib/files";
export { buildBreadcrumb, collectDescendantIds, type BreadcrumbItem } from "../../../src/lib/folder-tree";
export { effectiveMaxFileBytes, resolvePlan } from "../../../src/lib/plans";
export type {
  DriveLink,
  Organization,
  OrganizationRole,
  TrashItem,
  Workspace,
} from "../../../src/lib/types/database";
