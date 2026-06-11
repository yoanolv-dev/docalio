"use client";

import { useState } from "react";
import { Download, LoaderCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileIcon } from "@/components/documents/file-icon";
import { getPortalDownloadUrl } from "@/lib/actions/share-links";
import { fileTypeLabel, extensionFromMime, formatBytes } from "@/lib/files";
import { getVisitorId } from "@/lib/visitor";
import { formatDate } from "@/lib/utils";
import type { PortalDocument } from "@/lib/types/database";

export function PortalDocumentList({
  token,
  documents,
}: {
  token: string;
  documents: PortalDocument[];
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(id: string) {
    setError(null);
    setDownloadingId(id);
    const result = await getPortalDownloadUrl(token, id, getVisitorId());
    setDownloadingId(null);
    if (result.ok) {
      window.location.assign(result.url);
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {documents.map((doc) => {
          const ext = extensionFromMime(doc.file_type);
          return (
            <li
              key={doc.id}
              className="flex items-center gap-3 p-3 sm:p-4"
            >
              <FileIcon fileType={doc.file_type} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  {ext && <span>{fileTypeLabel(ext)}</span>}
                  {ext && <span>·</span>}
                  <span>{formatBytes(doc.file_size)}</span>
                  <span>·</span>
                  <span>{formatDate(doc.created_at)}</span>
                </p>
                {doc.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {doc.description}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {doc.allow_download ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(doc.id)}
                    disabled={downloadingId === doc.id}
                  >
                    {downloadingId === doc.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Télécharger</span>
                  </Button>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground"
                    title="Consultation seule"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Lecture seule</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
