"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive,
  ChevronRight,
  CloudUpload,
  Download,
  File as FileIconGlyph,
  Folder,
  House,
  KeyRound,
  Link2,
  LoaderCircle,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileIcon } from "@/components/documents/file-icon";
import { FileViewer, type ViewerFile } from "@/components/drive/file-viewer";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, previewKind, sanitizeFileName } from "@/lib/files";
import { getVisitorId } from "@/lib/visitor";
import { cn, formatDate, getInitials } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Vue publique d'un lien de partage : navigation dans le dossier partagé,
// aperçu, téléchargement (fichier ou ZIP), dépôt de fichiers si autorisé,
// déverrouillage par mot de passe. Aucun compte requis.
// ---------------------------------------------------------------------------

const STORAGE_BUCKET = "documents";

interface LinkFolder {
  id: string;
  name: string;
  updated_at: string;
  items: number;
}
interface LinkFile {
  id: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
  updated_at: string;
}
interface LinkData {
  status: "ok" | "password" | "locked" | "invalid";
  organization?: {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    plan: string;
  };
  link?: {
    can_view: boolean;
    can_download: boolean;
    can_upload: boolean;
    expires_at: string | null;
    label: string | null;
  };
  root?: { kind: "file" | "folder" | "space"; name: string; id?: string };
  folder_id?: string | null;
  breadcrumb?: { id: string; name: string }[];
  folders?: LinkFolder[];
  files?: LinkFile[];
}

function sessionKey(token: string) {
  return `docalio:link-session:${token}`;
}

export function LinkView({ token }: { token: string }) {
  const supabase = useRef(createClient()).current;
  const [data, setData] = useState<LinkData | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [uploads, setUploads] = useState<{ id: string; name: string; status: "uploading" | "done" | "error"; message?: string }[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRecorded = useRef(false);

  const getSession = useCallback((): string | null => {
    try {
      return window.localStorage.getItem(sessionKey(token));
    } catch {
      return null;
    }
  }, [token]);

  const load = useCallback(
    async (targetFolder: string | null) => {
      const { data: result } = await supabase.rpc("link_get", {
        p_token: token,
        p_session: getSession(),
        p_folder_id: targetFolder,
      });
      const d = (result as LinkData | null) ?? { status: "invalid" as const };
      setData(d);
      if (d.status === "ok") {
        setFolderId(d.folder_id ?? null);
        if (!openRecorded.current) {
          openRecorded.current = true;
          void supabase.rpc("link_record_open", {
            p_token: token,
            p_session: getSession(),
            p_visitor_id: getVisitorId(),
          });
        }
      }
    },
    [supabase, token, getSession]
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setUnlockError(null);
    const { data: result } = await supabase.rpc("link_unlock", {
      p_token: token,
      p_password: password,
    });
    setBusy(false);
    const r = result as { status: string; session?: string | null; until?: string } | null;
    if (!r || r.status === "invalid") {
      setUnlockError("Ce lien n'est plus valide.");
    } else if (r.status === "wrong_password") {
      setUnlockError("Mot de passe incorrect.");
    } else if (r.status === "locked") {
      setUnlockError("Trop de tentatives — réessayez dans quelques minutes.");
    } else {
      if (r.session) {
        try {
          window.localStorage.setItem(sessionKey(token), r.session);
        } catch {}
      }
      setPassword("");
      await load(null);
    }
  }

  async function fileAccess(fileId: string, download: boolean) {
    const { data: result } = await supabase.rpc("link_file_access", {
      p_token: token,
      p_session: getSession(),
      p_document_id: fileId,
      p_download: download,
      p_visitor_id: getVisitorId(),
    });
    return result as { path: string; name: string } | null;
  }

  async function signedUrl(path: string, downloadName?: string) {
    const { data: result } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 600, downloadName ? { download: downloadName } : undefined);
    return result?.signedUrl ?? null;
  }

  const getPreviewUrl = useCallback(
    async (f: ViewerFile) => {
      const access = await fileAccess(f.id, false);
      if (!access) return { ok: false as const, message: "Aperçu indisponible." };
      const url = await signedUrl(access.path);
      return url
        ? { ok: true as const, url }
        : { ok: false as const, message: "Aperçu indisponible." };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  async function downloadFile(f: LinkFile) {
    setError(null);
    const access = await fileAccess(f.id, true);
    if (!access) {
      setError("Téléchargement non autorisé sur ce lien.");
      return;
    }
    const url = await signedUrl(access.path, f.name);
    if (url) window.location.assign(url);
  }

  async function downloadZip() {
    if (!data?.root) return;
    setZipBusy(true);
    setError(null);
    try {
      const { data: manifest } = await supabase.rpc("link_zip_manifest", {
        p_token: token,
        p_session: getSession(),
        p_folder_id: folderId,
        p_visitor_id: getVisitorId(),
      });
      const entries = (manifest as { path: string; name: string; size: number }[] | null) ?? [];
      if (entries.length === 0) {
        setError("Rien à télécharger dans ce dossier.");
        return;
      }
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const entry of entries) {
        const url = await signedUrl(entry.path);
        if (!url) continue;
        const blob = await fetch(url).then((r) => (r.ok ? r.blob() : null));
        if (blob) zip.file(entry.name, blob);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitizeFileName(data.root.name) || "fichiers"}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError("Le téléchargement groupé a échoué. Réessayez.");
    } finally {
      setZipBusy(false);
    }
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setError(null);
    const { data: prefixData } = await supabase.rpc("link_upload_prefix", {
      p_token: token,
      p_session: getSession(),
    });
    const prefix = prefixData as string | null;
    if (!prefix) {
      setError("Le dépôt n'est pas autorisé sur ce lien.");
      return;
    }
    for (const file of files) {
      const id = crypto.randomUUID();
      setUploads((u) => [...u, { id, name: file.name, status: "uploading" }]);
      const path = `${prefix}${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) {
        setUploads((u) =>
          u.map((x) => (x.id === id ? { ...x, status: "error", message: "L'envoi a échoué." } : x))
        );
        continue;
      }
      const { data: completed } = await supabase.rpc("link_complete_upload", {
        p_token: token,
        p_session: getSession(),
        p_folder_id: folderId,
        p_path: path,
        p_name: file.name,
        p_type: file.type || null,
        p_visitor_id: getVisitorId(),
      });
      const r = completed as { status: string } | null;
      setUploads((u) =>
        u.map((x) =>
          x.id === id
            ? {
                ...x,
                status: r?.status === "ok" ? "done" : "error",
                message:
                  r?.status === "quota"
                    ? "Espace de stockage du destinataire plein."
                    : r?.status !== "ok"
                      ? "L'envoi a échoué."
                      : undefined,
              }
            : x
        )
      );
    }
    await load(folderId);
  }

  // --- États d'accès ---------------------------------------------------------

  if (data === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (data.status === "invalid") {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Link2 className="h-5 w-5 text-muted-foreground" />
          </span>
          <h1 className="mt-5 text-lg font-semibold">Lien indisponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien de partage est invalide, a expiré ou a été révoqué.
            Demandez un nouveau lien à la personne qui vous l&apos;a envoyé.
          </p>
        </div>
      </Shell>
    );
  }

  const org = data.organization;
  const accent = org?.primary_color ?? "#2563eb";
  const branded = org && org.plan !== "starter";

  if (data.status === "password" || data.status === "locked") {
    return (
      <Shell org={org} accent={accent} branded={!!branded}>
        <form
          onSubmit={unlock}
          className="mx-auto w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm"
        >
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: accent }}
          >
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-center text-lg font-semibold">
            Fichiers protégés
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            {org?.name} a protégé ce partage par un mot de passe.
          </p>
          <div className="mt-5 space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
              disabled={data.status === "locked"}
            />
            {(unlockError || data.status === "locked") && (
              <p className="text-sm text-red-600">
                {unlockError ??
                  "Trop de tentatives — réessayez dans quelques minutes."}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy || data.status === "locked"}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Déverrouiller
            </Button>
          </div>
        </form>
      </Shell>
    );
  }

  // --- Contenu ---------------------------------------------------------------

  const folders = data.folders ?? [];
  const files = data.files ?? [];
  const link = data.link!;
  const root = data.root!;
  const isEmpty = folders.length === 0 && files.length === 0;

  const viewerFiles: ViewerFile[] = files.map((f) => ({
    id: f.id,
    name: f.name,
    filePath: f.name,
    fileType: f.file_type,
    size: f.file_size,
  }));

  return (
    <Shell org={org} accent={accent} branded={!!branded}>
      <div className="mx-auto w-full max-w-3xl">
        {/* En-tête du partage */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {root.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {org?.name} partage{" "}
              {root.kind === "file"
                ? "ce fichier"
                : root.kind === "folder"
                  ? "ce dossier"
                  : "ces fichiers"}{" "}
              avec vous
              {link.expires_at ? ` · accès jusqu'au ${formatDate(link.expires_at)}` : ""}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {link.can_upload && (
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                <CloudUpload className="h-4 w-4" />
                Déposer des fichiers
              </Button>
            )}
            {link.can_download && root.kind !== "file" && (files.length > 0 || folders.length > 0) && (
              <Button onClick={downloadZip} disabled={zipBusy} style={{ backgroundColor: accent }}>
                {zipBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                Tout télécharger
              </Button>
            )}
          </div>
        </div>

        {/* Fil d'Ariane (navigation dans le dossier partagé) */}
        {root.kind !== "file" && (data.breadcrumb?.length ?? 0) > 0 && (
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => load(null)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium hover:bg-muted"
            >
              <House className="h-3.5 w-3.5" />
              {root.name}
            </button>
            {data.breadcrumb!.map((c) => (
              <span key={c.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                <button
                  type="button"
                  onClick={() => load(c.id)}
                  className="rounded px-1.5 py-0.5 font-medium hover:bg-muted"
                >
                  {c.name}
                </button>
              </span>
            ))}
          </nav>
        )}

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {/* Dépôts en cours */}
        {uploads.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {uploads.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                {u.status === "uploading" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : u.status === "done" ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ) : (
                  <FileIconGlyph className="h-4 w-4 text-red-500" />
                )}
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <span className="text-xs text-muted-foreground">
                  {u.status === "uploading" ? "Envoi…" : u.status === "done" ? "Reçu" : u.message}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Zone de dépôt + listing */}
        <div
          onDragOver={(e) => {
            if (link.can_upload) {
              e.preventDefault();
              setDrag(true);
            }
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            if (!link.can_upload) return;
            e.preventDefault();
            setDrag(false);
            void uploadFiles(Array.from(e.dataTransfer.files ?? []));
          }}
          className={cn(
            "overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors",
            drag ? "border-2 border-dashed" : "border-border"
          )}
          style={drag ? { borderColor: accent } : undefined}
        >
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              {link.can_upload ? (
                <>
                  <CloudUpload className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">Déposez vos fichiers ici</p>
                  <p className="text-xs text-muted-foreground">
                    Ils seront transmis directement à {org?.name}.
                  </p>
                </>
              ) : (
                <>
                  <Folder className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Ce dossier est vide.</p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {folders.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => load(f.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas/60"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accent}1a`, color: accent }}
                    >
                      <Folder className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {f.items} élément{f.items > 1 ? "s" : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
              {files.map((f, i) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="[&>div]:h-9 [&>div]:w-9 [&_svg]:h-4 [&_svg]:w-4">
                    <FileIcon filePath={f.name} fileType={f.file_type} />
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      previewKind(f.name, f.file_type) !== "none"
                        ? setViewerIndex(i)
                        : link.can_download
                          ? downloadFile(f)
                          : undefined
                    }
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatBytes(f.file_size)} · {formatDate(f.updated_at)}
                    </span>
                  </button>
                  {link.can_download && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 p-0"
                      title="Télécharger"
                      onClick={() => downloadFile(f)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Transfert chiffré · hébergé dans l&apos;Union européenne
        </p>
      </div>

      {link.can_upload && (
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            void uploadFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      )}

      {viewerIndex !== null && viewerFiles[viewerIndex] && (
        <FileViewer
          files={viewerFiles}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          getPreviewUrl={getPreviewUrl}
          getDownloadUrl={
            link.can_download
              ? async (f) => {
                  const access = await fileAccess(f.id, true);
                  if (!access) return { ok: false as const, message: "Non autorisé." };
                  const url = await signedUrl(access.path, f.name);
                  return url
                    ? { ok: true as const, url }
                    : { ok: false as const, message: "Indisponible." };
                }
              : undefined
          }
        />
      )}
    </Shell>
  );
}

function Shell({
  children,
  org,
  accent = "#2563eb",
  branded = false,
}: {
  children: React.ReactNode;
  org?: { name: string; logo_url: string | null } | null;
  accent?: string;
  branded?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          {org ? (
            <>
              {org.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={org.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover ring-1 ring-black/5"
                />
              ) : (
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {getInitials(org.name)}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold leading-tight">{org.name}</p>
                <p className="text-xs text-muted-foreground">Partage de fichiers sécurisé</p>
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold">Partage de fichiers</p>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      {!branded && (
        <footer className="pb-6 text-center text-xs text-muted-foreground">
          Propulsé par{" "}
          <a href="https://docalio.app" className="font-medium hover:underline">
            Docalio
          </a>{" "}
          — le drive professionnel français
        </footer>
      )}
    </div>
  );
}
