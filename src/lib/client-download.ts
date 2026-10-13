"use client";

import { downloadZip } from "client-zip";

/** Lance le téléchargement d'une URL (signée) sans quitter la page. */
export function triggerDownload(url: string, name?: string) {
  const a = document.createElement("a");
  a.href = url;
  if (name) a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Assemble un ZIP dans le navigateur à partir d'URL signées (les fichiers sont
 * lus un par un, en flux), puis le télécharge.
 */
export async function downloadAsZip(
  entries: { name: string; url: string }[],
  zipName: string,
  onProgress?: (done: number, total: number) => void
) {
  let done = 0;
  async function* files() {
    for (const entry of entries) {
      const res = await fetch(entry.url);
      if (!res.ok) throw new Error(`Lecture impossible : ${entry.name}`);
      yield { name: entry.name, input: res };
      done += 1;
      onProgress?.(done, entries.length);
    }
  }
  const blob = await downloadZip(files()).blob();
  const url = URL.createObjectURL(blob);
  triggerDownload(url, zipName.endsWith(".zip") ? zipName : `${zipName}.zip`);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
