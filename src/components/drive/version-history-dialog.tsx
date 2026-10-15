"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, History, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getVersionDownloadUrl,
  listVersionsAction,
  restoreVersionAction,
} from "@/lib/actions/drive";
import { formatBytes } from "@/lib/files";
import { formatDate } from "@/lib/utils";
import type { Document } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Historique des versions d'un fichier : chaque « Remplacer » archive la
// version précédente ; on peut la retélécharger ou la rétablir.
// ---------------------------------------------------------------------------

type VersionRow = Awaited<ReturnType<typeof listVersionsAction>>[number];

export function VersionHistoryDialog({
  doc,
  workspaceId,
  onOpenChange,
}: {
  doc: Document;
  workspaceId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listVersionsAction(doc.id).then((rows) => {
      if (!cancelled) setVersions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  async function download(versionId: string) {
    const r = await getVersionDownloadUrl(versionId);
    if (r.ok) window.location.assign(r.url);
    else setError(r.message);
  }

  function restore(versionId: string) {
    setError(null);
    startTransition(async () => {
      const r = await restoreVersionAction(workspaceId, versionId);
      if (!r.ok) {
        setError(r.message ?? "Restauration impossible.");
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historique — {doc.title}
          </DialogTitle>
          <DialogDescription>
            Version actuelle : v{doc.version} · {formatBytes(doc.file_size)} ·{" "}
            {formatDate(doc.file_updated_at)}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {versions === null ? (
          <p className="py-4 text-center">
            <LoaderCircle className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
          </p>
        ) : versions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
            Aucune version antérieure. Utilisez « Remplacer » pour envoyer une
            nouvelle version : l&apos;ancienne sera conservée ici.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  v{v.version}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatDate(v.created_at)}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(v.file_size)}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Télécharger cette version"
                  onClick={() => download(v.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={busy}
                  onClick={() => restore(v.id)}
                >
                  {busy ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Rétablir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
