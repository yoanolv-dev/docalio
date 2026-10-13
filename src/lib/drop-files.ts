"use client";

// Lecture des fichiers déposés (glisser-déposer) ou choisis, dossiers compris.

export interface UploadEntry {
  file: File;
  /** Dossiers à recréer, relatifs à la destination (« Factures/2026 »), "" sinon. */
  relativeDir: string;
}

const IGNORED = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

function keep(file: File): boolean {
  return !IGNORED.has(file.name.toLowerCase()) && !file.name.startsWith("~$");
}

function readAll(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const next = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) return resolve(all);
        all.push(...batch);
        next();
      }, reject);
    next();
  });
}

function entryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function walk(entry: FileSystemEntry, dir: string, out: UploadEntry[]) {
  if (entry.isFile) {
    const file = await entryFile(entry as FileSystemFileEntry);
    if (keep(file)) out.push({ file, relativeDir: dir });
    return;
  }
  if (entry.isDirectory) {
    const children = await readAll((entry as FileSystemDirectoryEntry).createReader());
    const sub = dir ? `${dir}/${entry.name}` : entry.name;
    for (const child of children) await walk(child, sub, out);
  }
}

/** Fichiers d'un dépôt (dossiers parcourus récursivement quand c'est possible). */
export async function entriesFromDataTransfer(dt: DataTransfer): Promise<UploadEntry[]> {
  const items = Array.from(dt.items ?? []).filter((i) => i.kind === "file");
  const roots = items
    .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => Boolean(e));

  if (roots.length === 0) {
    return Array.from(dt.files ?? []).filter(keep).map((file) => ({ file, relativeDir: "" }));
  }
  const out: UploadEntry[] = [];
  for (const root of roots) await walk(root, "", out);
  return out;
}

/** Fichiers choisis via un champ (avec `webkitdirectory` pour un dossier). */
export function entriesFromInput(files: FileList | null): UploadEntry[] {
  return Array.from(files ?? [])
    .filter(keep)
    .map((file) => {
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? "";
      const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
      return { file, relativeDir: dir };
    });
}

/** Le glisser-déposer en cours transporte-t-il des fichiers du système ? */
export function isFileDrag(e: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}
