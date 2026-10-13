"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  LoaderCircle,
  Share2,
  X,
} from "lucide-react";
import { ItemIcon } from "@/components/drive/item-icon";
import { fileKindLabel, formatBytes, previewKind } from "@/lib/files";
import { cn } from "@/lib/utils";

export interface PreviewFile {
  id: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
}

type UrlResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Aperçu plein écran : images, PDF, vidéos, audio et texte, directement dans
 * le navigateur (aucun service tiers). Flèches ← → pour passer d'un fichier à
 * l'autre, Échap pour fermer.
 */
export function FilePreview({
  files,
  index,
  onIndexChange,
  onClose,
  getUrl,
  onDownload,
  onShare,
  onDetails,
}: {
  files: PreviewFile[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  getUrl: (id: string) => Promise<UrlResult>;
  onDownload?: (file: PreviewFile) => void;
  onShare?: (file: PreviewFile) => void;
  onDetails?: (file: PreviewFile) => void;
}) {
  const file = files[index];
  const kind = file ? previewKind(file.name, file.file_type, file.file_size) : null;
  const [state, setState] = useState<{ id: string; url?: string; text?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!file || !kind) return;
    let cancelled = false;
    getUrl(file.id).then(async (r) => {
      if (cancelled) return;
      if (!r.ok) {
        setState({ id: file.id, error: r.message });
        return;
      }
      if (kind === "text") {
        try {
          const text = await fetch(r.url).then((res) => res.text());
          if (!cancelled) setState({ id: file.id, url: r.url, text });
        } catch {
          if (!cancelled) setState({ id: file.id, error: "Aperçu indisponible." });
        }
        return;
      }
      setState({ id: file.id, url: r.url });
    });
    return () => {
      cancelled = true;
    };
  }, [file, kind, getUrl]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && index < files.length - 1) onIndexChange(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, files.length, onClose, onIndexChange]);

  if (!file) return null;
  const ready = state?.id === file.id ? state : null;

  return (
    <div className="animate-overlay-in fixed inset-0 z-[90] flex flex-col bg-slate-950 text-white" role="dialog" aria-modal="true" aria-label={`Aperçu de ${file.name}`}>
      <header className="flex h-14 shrink-0 items-center gap-3 px-3 sm:px-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'aperçu"
          className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <ItemIcon kind="file" name={file.name} mime={file.file_type} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="truncate text-xs text-white/50">
            {fileKindLabel(file.name, file.file_type)} · {formatBytes(file.file_size)}
            {files.length > 1 && ` · ${index + 1} sur ${files.length}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onShare && (
            <button type="button" onClick={() => onShare(file)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Partager</span>
            </button>
          )}
          {onDetails && (
            <button type="button" onClick={() => onDetails(file)} aria-label="Détails" className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <Info className="h-4 w-4" />
            </button>
          )}
          {onDownload && (
            <button type="button" onClick={() => onDownload(file)} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-white/90">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Télécharger</span>
            </button>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4 sm:px-16">
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            aria-label="Fichier précédent"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {index < files.length - 1 && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            aria-label="Fichier suivant"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:right-4"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {!kind ? (
          <NoPreview file={file} onDownload={onDownload} />
        ) : ready?.error ? (
          <p className="text-sm text-white/70">{ready.error}</p>
        ) : !ready?.url ? (
          <LoaderCircle className="h-7 w-7 animate-spin text-white/60" />
        ) : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ready.url} alt={file.name} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        ) : kind === "pdf" ? (
          <iframe src={ready.url} title={file.name} className="h-full w-full max-w-5xl rounded-lg bg-white" />
        ) : kind === "video" ? (
          <video src={ready.url} controls autoPlay className="max-h-full max-w-full rounded-lg shadow-2xl" />
        ) : kind === "audio" ? (
          <div className="w-full max-w-md rounded-2xl bg-white/5 p-6 text-center">
            <ItemIcon kind="file" name={file.name} mime={file.file_type} size="lg" className="mx-auto" />
            <p className="mt-4 truncate text-sm">{file.name}</p>
            <audio src={ready.url} controls autoPlay className="mt-5 w-full" />
          </div>
        ) : (
          <pre className={cn("h-full w-full max-w-4xl overflow-auto whitespace-pre-wrap rounded-lg bg-white p-6 font-mono text-[13px] leading-relaxed text-slate-800")}>
            {ready.text}
          </pre>
        )}
      </div>
    </div>
  );
}

function NoPreview({ file, onDownload }: { file: PreviewFile; onDownload?: (f: PreviewFile) => void }) {
  return (
    <div className="max-w-sm text-center">
      <ItemIcon kind="file" name={file.name} mime={file.file_type} size="lg" className="mx-auto" />
      <p className="mt-4 font-medium">{file.name}</p>
      <p className="mt-1 text-sm text-white/60">
        Pas d&apos;aperçu pour ce type de fichier. Téléchargez-le pour l&apos;ouvrir.
      </p>
      {onDownload && (
        <button
          type="button"
          onClick={() => onDownload(file)}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-white/90"
        >
          <Download className="h-4 w-4" />
          Télécharger
        </button>
      )}
    </div>
  );
}
