import Link from "next/link";
import { ItemIcon } from "@/components/drive/item-icon";
import { formatBytes } from "@/lib/files";
import { formatRelativeTime } from "@/lib/utils";
import type { LocatedFile } from "@/lib/drive";

export function locatedFileHref(f: Pick<LocatedFile, "id" | "workspace_id" | "folder_id">) {
  const params = new URLSearchParams();
  if (f.folder_id) params.set("dossier", f.folder_id);
  params.set("apercu", f.id);
  return `/dashboard/workspaces/${f.workspace_id}?${params.toString()}`;
}

/** Liste de fichiers avec leur emplacement (récents, recherche). */
export function LocatedFileList({
  files,
  people = {},
}: {
  files: LocatedFile[];
  people?: Record<string, string>;
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
      {files.map((f) => {
        const by = f.file_updated_by ? people[f.file_updated_by] : undefined;
        return (
          <li key={f.id}>
            <Link href={locatedFileHref(f)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
              <ItemIcon kind="file" name={f.name} mime={f.file_type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[f.workspace_name, f.location].filter(Boolean).join(" › ")}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                {formatRelativeTime(f.file_updated_at)}
                {by ? ` · ${by}` : ""}
              </span>
              <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">
                {formatBytes(f.file_size)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
