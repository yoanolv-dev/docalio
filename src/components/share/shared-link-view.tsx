"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  CircleAlert,
  Download,
  FolderDown,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";
import { ItemIcon } from "@/components/drive/item-icon";
import { FilePreview } from "@/components/drive/file-preview";
import {
  linkCompleteUploadAction,
  linkFileUrlAction,
  linkPrepareUploadAction,
  linkZipAction,
  recordLinkOpenAction,
} from "@/lib/actions/public-links";
import type { PublicLinkData } from "@/lib/public-link";
import { uploadToStorage } from "@/lib/storage-upload";
import { downloadAsZip, triggerDownload } from "@/lib/client-download";
import { entriesFromDataTransfer, entriesFromInput, isFileDrag } from "@/lib/drop-files";
import { getVisitorId } from "@/lib/visitor";
import { formatBytes } from "@/lib/files";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

type Ok = Extract<PublicLinkData, { status: "ok" }>;

interface Sent {
  id: number;
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

/** Contenu d'un lien de partage : dossiers, fichiers, aperçu, ZIP, dépôt. */
export function SharedLinkView({ token, data }: { token: string; data: Ok }) {
  const router = useRouter();
  const { link, root, files, folders, breadcrumb, organization } = data;
  const accent = organization.primary_color ?? "#2563eb";
  const [preview, setPreview] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void recordLinkOpenAction(token, getVisitorId());
  }, [token]);

  const folderHref = (id: string | null) => (id ? `/s/${token}?dossier=${id}` : `/s/${token}`);
  const crumbs = breadcrumb.filter((c) => c.id !== root.id);

  async function download(fileId: string) {
    setError(null);
    const r = await linkFileUrlAction(token, fileId, true, getVisitorId());
    if (r.ok) triggerDownload(r.url, r.name);
    else setError(r.message);
  }

  async function downloadAll() {
    setError(null);
    setBusy("Préparation du ZIP…");
    const r = await linkZipAction(token, data.folder_id, getVisitorId());
    if (!r.ok) {
      setBusy(null);
      setError(r.message);
      return;
    }
    try {
      await downloadAsZip(r.entries, crumbs.at(-1)?.name ?? root.name, (d, t) => setBusy(`ZIP : ${d} / ${t} fichiers`));
    } catch {
      setError("Le ZIP n'a pas pu être créé. Réessayez ou téléchargez les fichiers un par un.");
    }
    setBusy(null);
  }

  async function upload(list: File[]) {
    if (list.length === 0) return;
    setError(null);
    const prepared = await linkPrepareUploadAction(
      token,
      list.map((f) => ({ name: f.name, size: f.size })),
      organization.plan
    );
    if (!prepared.ok) {
      setError(prepared.message);
      return;
    }
    const base = Date.now();
    setSent((s) => [...list.map((f, i) => ({ id: base + i, name: f.name, progress: 0, status: "uploading" as const })), ...s]);
    let done = 0;
    await Promise.all(
      list.map(async (file, i) => {
        const id = base + i;
        const slot = prepared.uploads[i];
        const patch = (u: Partial<Sent>) => setSent((s) => s.map((x) => (x.id === id ? { ...x, ...u } : x)));
        if (!slot || "error" in slot) {
          patch({ status: "error", error: slot && "error" in slot ? slot.error : "Envoi impossible." });
          return;
        }
        try {
          await uploadToStorage(file, slot.path, null, (p) => patch({ progress: p })).promise;
          const r = await linkCompleteUploadAction({
            token,
            folderId: data.folder_id,
            path: slot.path,
            name: file.name,
            type: file.type || null,
            visitorId: getVisitorId(),
          });
          if (r.ok) {
            done += 1;
            patch({ status: "done", progress: 1 });
          } else patch({ status: "error", error: r.message });
        } catch (e) {
          patch({ status: "error", error: e instanceof Error ? e.message : "Envoi impossible." });
        }
      })
    );
    if (done && link.can_view) router.refresh();
  }

  const previewable = files;
  const single = root.kind === "file" ? files[0] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
            {link.can_view ? "Partagé avec vous" : "Dépôt de fichiers"}
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{link.label || root.name}</h1>
          <p suppressHydrationWarning className="mt-1 text-sm text-muted-foreground">
            {organization.name}
            {link.expires_at ? ` · disponible jusqu'au ${formatDate(link.expires_at)}` : ""}
          </p>
        </div>
        {link.can_download && root.kind !== "file" && (files.length > 0 || folders.length > 0) && (
          <button
            type="button"
            onClick={() => void downloadAll()}
            disabled={busy !== null}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FolderDown className="h-4 w-4" />}
            {busy ?? "Tout télécharger"}
          </button>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {link.can_view && single && (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-white px-6 py-10 text-center">
          <ItemIcon kind="file" name={single.name} mime={single.file_type} size="lg" />
          <p className="mt-4 max-w-full break-words font-semibold">{single.name}</p>
          <p suppressHydrationWarning className="mt-1 text-sm text-muted-foreground">
            {formatBytes(single.file_size)} · mis à jour {formatRelativeTime(single.updated_at).replace(/^I/, "i")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => setPreview(0)} className="h-10 rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-slate-50">
              Aperçu
            </button>
            {link.can_download && (
              <button
                type="button"
                onClick={() => void download(single.id)}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                <Download className="h-4 w-4" />
                Télécharger
              </button>
            )}
          </div>
        </div>
      )}

      {link.can_view && !single && (
        <>
          {crumbs.length > 0 && (
            <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-0.5 text-sm">
              <Link href={folderHref(null)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-white hover:text-foreground">
                {root.name}
              </Link>
              {crumbs.map((c, i) => (
                <span key={c.id} className="flex items-center gap-0.5">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  {i === crumbs.length - 1 ? (
                    <span className="px-2 py-1 font-semibold">{c.name}</span>
                  ) : (
                    <Link href={folderHref(c.id)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-white hover:text-foreground">
                      {c.name}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          )}

          {folders.length + files.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
              Ce dossier est vide.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
              {folders.map((f) => (
                <li key={f.id}>
                  <Link href={folderHref(f.id)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                    <ItemIcon kind="folder" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.items} élément{f.items > 1 ? "s" : ""}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>
                </li>
              ))}
              {files.map((f, i) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
                  <button type="button" onClick={() => setPreview(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ItemIcon kind="file" name={f.name} mime={f.file_type} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span suppressHydrationWarning className="block text-xs text-muted-foreground">
                        {formatBytes(f.file_size)} · {formatRelativeTime(f.updated_at)}
                      </span>
                    </span>
                  </button>
                  {link.can_download && (
                    <button
                      type="button"
                      onClick={() => void download(f.id)}
                      aria-label={`Télécharger ${f.name}`}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {link.can_upload && (
        <section
          onDragOver={(e) => {
            if (isFileDrag(e)) {
              e.preventDefault();
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={async (e) => {
            if (!isFileDrag(e)) return;
            e.preventDefault();
            setDragging(false);
            const entries = await entriesFromDataTransfer(e.dataTransfer);
            void upload(entries.map((x) => x.file));
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed bg-white p-8 text-center transition-colors",
            dragging ? "border-current bg-slate-50" : "border-border"
          )}
          style={dragging ? { color: accent } : undefined}
        >
          <UploadCloud className="mx-auto h-9 w-9" style={{ color: accent }} />
          <p className="mt-3 font-semibold text-foreground">Déposez vos fichiers ici</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ils seront transmis en toute sécurité à {organization.name}.
          </p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Choisir des fichiers
          </button>
          <input
            ref={input}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void upload(entriesFromInput(e.target.files).map((x) => x.file));
              e.target.value = "";
            }}
          />
          {sent.length > 0 && (
            <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
              {sent.map((s) => (
                <li key={s.id} className="rounded-xl border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                    {s.status === "done" && <Check className="h-4 w-4 text-emerald-600" />}
                    {s.status === "uploading" && <span className="text-xs tabular-nums text-muted-foreground">{Math.round(s.progress * 100)} %</span>}
                  </div>
                  {s.status === "uploading" && (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.round(s.progress * 100)}%`, backgroundColor: accent }} />
                    </div>
                  )}
                  {s.status === "error" && <p className="mt-0.5 text-xs text-red-600">{s.error}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {preview !== null && previewable[preview] && (
        <FilePreview
          files={previewable}
          index={preview}
          onIndexChange={setPreview}
          onClose={() => setPreview(null)}
          getUrl={(id) => linkFileUrlAction(token, id, false)}
          onDownload={link.can_download ? (f) => void download(f.id) : undefined}
        />
      )}
    </div>
  );
}
