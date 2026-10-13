"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { linkSessionCookie, readLinkSession } from "@/lib/public-link";
import { sanitizeFileName, validateDriveFile } from "@/lib/files";
import { effectiveMaxFileBytes, getPlan } from "@/lib/plans";
import type { OrganizationPlan } from "@/lib/types/database";

// =============================================================================
// Actions de la page publique d'un lien de partage. Toujours avec le client
// anonyme : seules les RPC contrôlées par jeton (et mot de passe) décident.
// =============================================================================

const BUCKET = "documents";

export async function unlockLinkAction(
  token: string,
  password: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("link_unlock", { p_token: token, p_password: password });
  const r = (data ?? { status: "invalid" }) as { status: string; session?: string | null };
  if (r.status === "ok") {
    if (r.session) {
      const store = await cookies();
      store.set(linkSessionCookie(token), r.session, {
        path: `/s/${token}`,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 12 * 60 * 60,
      });
    }
    return { ok: true };
  }
  if (r.status === "locked") {
    return { ok: false, message: "Trop d'essais. Ce lien est bloqué pendant 15 minutes." };
  }
  if (r.status === "wrong_password") return { ok: false, message: "Mot de passe incorrect." };
  return { ok: false, message: "Ce lien n'est plus valide." };
}

export async function recordLinkOpenAction(token: string, visitorId: string): Promise<void> {
  const supabase = createPublicClient();
  await supabase.rpc("link_record_open", {
    p_token: token,
    p_session: await readLinkSession(token),
    p_visitor_id: visitorId,
  });
}

export type LinkFileUrl = { ok: true; url: string; name: string } | { ok: false; message: string };

/** URL signée (5 min en aperçu, 1 min en téléchargement) d'un fichier du lien. */
export async function linkFileUrlAction(
  token: string,
  documentId: string,
  download: boolean,
  visitorId?: string
): Promise<LinkFileUrl> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("link_file_access", {
    p_token: token,
    p_session: await readLinkSession(token),
    p_document_id: documentId,
    p_download: download,
    p_visitor_id: visitorId ?? null,
  });
  const file = data as { path: string; name: string } | null;
  if (!file?.path) return { ok: false, message: download ? "Téléchargement non autorisé." : "Aperçu indisponible." };

  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.path, download ? 60 : 300, download ? { download: file.name } : undefined);
  if (error || !signed?.signedUrl) return { ok: false, message: "Fichier indisponible. Réessayez." };
  return { ok: true, url: signed.signedUrl, name: file.name };
}

/** Fichiers d'un dossier du lien (sous-dossiers compris) pour un ZIP. */
export async function linkZipAction(
  token: string,
  folderId: string | null,
  visitorId?: string
): Promise<{ ok: true; entries: { name: string; url: string }[] } | { ok: false; message: string }> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("link_zip_manifest", {
    p_token: token,
    p_session: await readLinkSession(token),
    p_folder_id: folderId,
    p_visitor_id: visitorId ?? null,
  });
  const rows = (data ?? null) as { path: string; name: string }[] | null;
  if (!rows) return { ok: false, message: "Téléchargement non autorisé." };
  if (rows.length === 0) return { ok: false, message: "Aucun fichier à télécharger." };

  const entries: { name: string; url: string }[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(chunk.map((r) => r.path), 600);
    (signed ?? []).forEach((s, j) => {
      if (s.signedUrl) entries.push({ name: chunk[j].name, url: s.signedUrl });
    });
  }
  return { ok: true, entries };
}

/** Chemins de dépôt pour un lot de fichiers (lien de dépôt). */
export async function linkPrepareUploadAction(
  token: string,
  files: { name: string; size: number }[],
  plan: string
): Promise<{ ok: true; uploads: ({ path: string } | { error: string })[] } | { ok: false; message: string }> {
  const supabase = createPublicClient();
  const { data: prefix } = await supabase.rpc("link_upload_prefix", {
    p_token: token,
    p_session: await readLinkSession(token),
  });
  if (!prefix || typeof prefix !== "string") return { ok: false, message: "Ce lien n'accepte pas de dépôt." };

  const maxBytes = effectiveMaxFileBytes(getPlan(plan as OrganizationPlan));
  return {
    ok: true,
    uploads: files.slice(0, 200).map((f) => {
      const error = validateDriveFile(f, maxBytes);
      return error ? { error } : { path: `${prefix}${randomUUID()}-${sanitizeFileName(f.name)}` };
    }),
  };
}

export async function linkCompleteUploadAction(input: {
  token: string;
  folderId: string | null;
  path: string;
  name: string;
  type: string | null;
  visitorId?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("link_complete_upload", {
    p_token: input.token,
    p_session: await readLinkSession(input.token),
    p_folder_id: input.folderId,
    p_path: input.path,
    p_name: input.name,
    p_type: input.type,
    p_visitor_id: input.visitorId ?? null,
  });
  const r = (data ?? { status: "invalid" }) as { status: string };
  if (r.status === "ok") return { ok: true };
  if (r.status === "quota") return { ok: false, message: "L'espace de stockage du destinataire est plein." };
  return { ok: false, message: "Dépôt refusé. Le lien a peut-être expiré." };
}
