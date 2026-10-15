"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileQuestion,
  LoaderCircle,
  X,
} from "lucide-react";
import { FileIcon } from "@/components/documents/file-icon";
import { formatBytes, previewKind } from "@/lib/files";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Visionneuse intégrée : aperçu des fichiers (PDF, images, vidéo, audio,
// texte) sans quitter l'application — l'expérience « vrai drive ».
// Navigation ← → entre les fichiers, Échap pour fermer.
// ---------------------------------------------------------------------------

export interface ViewerFile {
  id: string;
  name: string;
  /** Sert à déterminer le type d'aperçu (chemin Storage ou nom + extension). */
  filePath: string;
  fileType?: string | null;
  size?: number | null;
}

export function FileViewer({
  files,
  index,
  onIndexChange,
  onClose,
  /** Produit une URL signée d'aperçu inline pour un fichier. */
  getPreviewUrl,
  /** Produit une URL signée de téléchargement (optionnel). */
  getDownloadUrl,
}: {
  files: ViewerFile[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  getPreviewUrl: (file: ViewerFile) => Promise<{ ok: true; url: string } | { ok: false; message: string }>;
  getDownloadUrl?: (file: ViewerFile) => Promise<{ ok: true; url: string } | { ok: false; message: string }>;
}) {
  const file = files[index];
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kind = file ? previewKind(file.filePath, file.fileType) : "none";
  const hasPrev = index > 0;
  const hasNext = index < files.length - 1;

  // Réinitialise l'aperçu quand on change de fichier (ajustement pendant le
  // rendu — cf. « you might not need an effect »).
  const [prevFileId, setPrevFileId] = useState(file?.id);
  if (file && prevFileId !== file.id) {
    setPrevFileId(file.id);
    setUrl(null);
    setError(null);
  }

  // Charge l'URL signée du fichier courant.
  useEffect(() => {
    if (!file || previewKind(file.filePath, file.fileType) === "none") return;
    let cancelled = false;
    getPreviewUrl(file).then((r) => {
      if (cancelled) return;
      if (r.ok) setUrl(r.url);
      else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  // « Chargement » est dérivé : un aperçu est attendu mais pas encore reçu.
  const loading = !!file && kind !== "none" && url === null && error === null;

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);
  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  // Raccourcis clavier.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  // Verrouille le scroll de la page derrière la visionneuse.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function download() {
    if (!file) return;
    const fn = getDownloadUrl ?? getPreviewUrl;
    const r = await fn(file);
    if (r.ok) window.location.assign(r.url);
  }

  if (!file) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${file.name}`}
      className="animate-overlay-in fixed inset-0 z-[90] flex flex-col bg-slate-950/90"
      onClick={onClose}
    >
      {/* Barre supérieure */}
      <div
        className="flex shrink-0 items-center gap-3 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="[&_svg]:h-4 [&_svg]:w-4 [&>div]:h-8 [&>div]:w-8">
          <FileIcon filePath={file.filePath} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-white/60">
            {files.length > 1 && `${index + 1} / ${files.length} · `}
            {formatBytes(file.size ?? null)}
          </p>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir dans un onglet"
            className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <button
          type="button"
          onClick={download}
          title="Télécharger"
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Fermer (Échap)"
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Contenu */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 pb-6">
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Fichier précédent"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Fichier suivant"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div
          className="flex h-full w-full items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <LoaderCircle className="h-7 w-7 animate-spin text-white/70" />
          ) : error ? (
            <Fallback name={file.name} message={error} onDownload={download} />
          ) : kind === "image" && url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={file.name}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          ) : kind === "pdf" && url ? (
            <iframe
              src={`${url}#toolbar=0`}
              title={file.name}
              className="h-full w-full max-w-4xl rounded-lg border-0 bg-white shadow-2xl"
            />
          ) : kind === "video" && url ? (
            <video src={url} controls autoPlay className="max-h-full max-w-full rounded-lg shadow-2xl" />
          ) : kind === "audio" && url ? (
            <div className="w-full max-w-md rounded-2xl bg-white/10 p-6 backdrop-blur">
              <p className="mb-4 truncate text-center text-sm font-medium text-white">{file.name}</p>
              <audio src={url} controls autoPlay className="w-full" />
            </div>
          ) : kind === "text" && url ? (
            <iframe
              src={url}
              title={file.name}
              sandbox=""
              className="h-full w-full max-w-3xl rounded-lg border-0 bg-white shadow-2xl"
            />
          ) : (
            <Fallback
              name={file.name}
              message="Ce type de fichier ne peut pas être prévisualisé."
              onDownload={download}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Fallback({
  name,
  message,
  onDownload,
}: {
  name: string;
  message: string;
  onDownload: () => void;
}) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 text-center">
      <FileQuestion className="h-10 w-10 text-white/50" />
      <p className="truncate text-sm font-medium text-white">{name}</p>
      <p className="text-sm text-white/60">{message}</p>
      <button
        type="button"
        onClick={onDownload}
        className={cn(
          "mt-1 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900",
          "transition-colors hover:bg-white/90"
        )}
      >
        <Download className="h-4 w-4" />
        Télécharger
      </button>
    </div>
  );
}
