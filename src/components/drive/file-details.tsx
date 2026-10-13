"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Download,
  History,
  Info,
  Link2,
  LoaderCircle,
  RotateCcw,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemIcon } from "@/components/drive/item-icon";
import { useToast } from "@/components/ui/toast";
import {
  deleteVersionAction,
  getFileDetailsAction,
  getFileUrlAction,
  restoreVersionAction,
} from "@/lib/actions/drive";
import type { DriveFile, FileDetails } from "@/lib/drive";
import { activityAction, activityActor } from "@/lib/activity-labels";
import { triggerDownload } from "@/lib/client-download";
import { fileKindLabel, formatBytes } from "@/lib/files";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

/**
 * Panneau latéral d'un fichier : informations, historique des versions
 * (télécharger, restaurer, supprimer) et activité.
 */
export function FileDetailsPanel({
  file,
  location,
  people,
  canWrite,
  onClose,
  onShare,
  onNewVersion,
}: {
  file: DriveFile;
  location: string;
  people: Record<string, string>;
  canWrite: boolean;
  onClose: () => void;
  onShare?: () => void;
  onNewVersion?: () => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"info" | "versions" | "activity">("info");
  const [details, setDetails] = useState<{ key: string; data: FileDetails } | null>(null);
  const [pending, start] = useTransition();
  const key = `${file.id}:${file.version}`;

  useEffect(() => {
    let cancelled = false;
    getFileDetailsAction(file.id).then((data) => {
      if (!cancelled) setDetails({ key, data });
    });
    return () => {
      cancelled = true;
    };
  }, [file.id, key]);

  const data = details?.key === key ? details.data : null;

  async function downloadVersion(versionId: string | null) {
    const r = await getFileUrlAction(file.id, { download: true, versionId });
    if (r.ok) triggerDownload(r.url, r.name);
    else toast.error(r.message);
  }

  const info: [string, string][] = [
    ["Type", fileKindLabel(file.name, file.file_type)],
    ["Taille", formatBytes(file.file_size)],
    ["Emplacement", location || "Racine de l'espace"],
    ["Version", `${file.version}`],
    ["Modifié", `${formatDate(file.file_updated_at)}${file.file_updated_by && people[file.file_updated_by] ? ` par ${people[file.file_updated_by]}` : ""}`],
    ["Ajouté", `${formatDate(file.created_at)}${file.created_by && people[file.created_by] ? ` par ${people[file.created_by]}` : ""}`],
  ];

  return (
    <aside className="animate-sheet-in fixed inset-y-0 right-0 z-[95] flex w-full max-w-sm flex-col border-l border-border bg-white shadow-2xl shadow-slate-900/10">
      <div className="flex items-start gap-3 border-b border-border p-4">
        <ItemIcon kind="file" name={file.name} mime={file.file_type} />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold leading-snug">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {fileKindLabel(file.name, file.file_type)} · {formatBytes(file.file_size)}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 border-b border-border px-4 py-3">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => downloadVersion(null)}>
          <Download className="h-3.5 w-3.5" />
          Télécharger
        </Button>
        {onShare && (
          <Button size="sm" variant="outline" className="flex-1" onClick={onShare}>
            <Share2 className="h-3.5 w-3.5" />
            Partager
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border px-3">
        {(
          [
            ["info", "Infos", Info],
            ["versions", "Versions", History],
            ["activity", "Activité", Link2],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors",
              tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {id === "versions" && data && data.versions.length > 0 && (
              <span className="rounded-full bg-canvas px-1.5 text-[11px] tabular-nums">{data.versions.length + 1}</span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "info" && (
          <div className="space-y-4">
            <dl className="divide-y divide-border rounded-xl border border-border">
              {info.map(([k, v]) => (
                <div key={k} className="flex gap-3 px-3 py-2.5 text-sm">
                  <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 flex-1 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {data && data.links.length > 0 && (
              <p className="flex items-center gap-2 rounded-lg bg-primary-subtle px-3 py-2 text-sm text-primary">
                <Link2 className="h-4 w-4" />
                {data.links.length} lien{data.links.length > 1 ? "s" : ""} de partage actif{data.links.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {tab === "versions" && (
          <div className="space-y-3">
            {canWrite && onNewVersion && (
              <Button variant="outline" size="sm" className="w-full" onClick={onNewVersion}>
                <Upload className="h-3.5 w-3.5" />
                Importer une nouvelle version
              </Button>
            )}
            <ol className="space-y-2">
              <li className="rounded-xl border border-primary/30 bg-primary-subtle/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Version {file.version} · actuelle</p>
                  <span className="text-xs text-muted-foreground">{formatBytes(file.file_size)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatRelativeTime(file.file_updated_at)}
                  {file.file_updated_by && people[file.file_updated_by] ? ` · ${people[file.file_updated_by]}` : ""}
                </p>
              </li>
              {!data ? (
                <li className="flex justify-center py-4">
                  <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                </li>
              ) : data.versions.length === 0 ? (
                <li className="px-1 text-xs text-muted-foreground">
                  Aucune version précédente. Déposez un fichier du même nom pour en créer une.
                </li>
              ) : (
                data.versions.map((v) => (
                  <li key={v.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Version {v.version}</p>
                      <span className="text-xs text-muted-foreground">{formatBytes(v.file_size)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(v.created_at)}
                      {v.created_by_name ? ` · ${v.created_by_name}` : ""}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => downloadVersion(v.id)}>
                        <Download className="h-3 w-3" />
                        Télécharger
                      </Button>
                      {canWrite && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const r = await restoreVersionAction(v.id);
                                if (r.ok) toast.show(`Version ${v.version} restaurée.`);
                                else toast.error(r.message);
                              })
                            }
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restaurer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const r = await deleteVersionAction(v.id);
                                if (r.ok) {
                                  toast.show(`Version ${v.version} supprimée.`);
                                  setDetails((d) =>
                                    d ? { ...d, data: { ...d.data, versions: d.data.versions.filter((x) => x.id !== v.id) } } : d
                                  );
                                } else toast.error(r.message);
                              })
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ol>
          </div>
        )}

        {tab === "activity" &&
          (!data ? (
            <div className="flex justify-center py-6">
              <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : data.activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-4">
              {data.activity.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-300" />
                  <p className="text-sm">
                    <span className="font-medium">{activityActor(e.event_type, e.actor_name)}</span>{" "}
                    {activityAction(e.event_type, e.metadata)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(e.created_at)}</p>
                </li>
              ))}
            </ol>
          ))}
      </div>
    </aside>
  );
}
