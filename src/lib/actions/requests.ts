"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFileName, validateFile } from "@/lib/files";
import type { RequestStatus } from "@/lib/types/database";

const STORAGE_BUCKET = "documents";
/** Plafond d'un dépôt client (le bucket borne aussi en défense en profondeur). */
const PORTAL_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

export type RequestActionResult = { ok: boolean; message?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function clean(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * Ajoute une ou plusieurs pièces demandées à un espace. `titles` permet la
 * création en lot (modèle sectoriel). Le workspace est lu via RLS : hors
 * périmètre → introuvable.
 */
export async function createRequestsAction(
  workspaceId: string,
  titles: string[],
  details?: { description?: string; dueDate?: string | null }
): Promise<RequestActionResult> {
  const { supabase, user } = await requireUser();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; organization_id: string }>();
  if (!ws) return { ok: false, message: "Espace introuvable." };

  const list = titles.map((t) => clean(t, 160)).filter(Boolean).slice(0, 30);
  if (list.length === 0) return { ok: false, message: "Indiquez la pièce attendue." };

  const { count } = await supabase
    .from("document_requests")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ws.id);

  const description = clean(details?.description, 1000) || null;
  const dueDate = details?.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(details.dueDate)
    ? details.dueDate
    : null;

  const { error } = await supabase.from("document_requests").insert(
    list.map((title, i) => ({
      organization_id: ws.organization_id,
      workspace_id: ws.id,
      title,
      description: list.length === 1 ? description : null,
      due_date: dueDate,
      position: (count ?? 0) + i,
      created_by: user.id,
    }))
  );
  if (error) {
    return {
      ok: false,
      message:
        "Impossible d'ajouter la demande. Vérifiez que la migration « document_requests » est appliquée.",
    };
  }

  revalidatePath(`/dashboard/workspaces/${ws.id}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: list.length > 1 ? `${list.length} pièces demandées.` : "Pièce demandée.",
  };
}

/** Valide ou refuse une pièce reçue (un refus rouvre le dépôt côté client). */
export async function reviewRequestAction(
  requestId: string,
  decision: Extract<RequestStatus, "validated" | "rejected">,
  comment?: string
): Promise<RequestActionResult> {
  const { supabase } = await requireUser();
  const { data: req } = await supabase
    .from("document_requests")
    .select("id, workspace_id")
    .eq("id", requestId)
    .maybeSingle<{ id: string; workspace_id: string }>();
  if (!req) return { ok: false, message: "Demande introuvable." };

  const { error } = await supabase
    .from("document_requests")
    .update({
      status: decision,
      review_comment: decision === "rejected" ? clean(comment, 1000) || null : null,
    })
    .eq("id", requestId);
  if (error) return { ok: false, message: "Mise à jour impossible. Réessayez." };

  revalidatePath(`/dashboard/workspaces/${req.workspace_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Supprime une demande (et le fichier déposé s'il existe). */
export async function deleteRequestAction(
  requestId: string
): Promise<RequestActionResult> {
  const { supabase } = await requireUser();
  const { data: req } = await supabase
    .from("document_requests")
    .select("id, workspace_id, file_path")
    .eq("id", requestId)
    .maybeSingle<{ id: string; workspace_id: string; file_path: string | null }>();
  if (!req) return { ok: false, message: "Demande introuvable." };

  const { error } = await supabase.from("document_requests").delete().eq("id", requestId);
  if (error) return { ok: false, message: "Suppression impossible." };
  if (req.file_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([req.file_path]);
  }

  revalidatePath(`/dashboard/workspaces/${req.workspace_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** URL signée (60 s) pour récupérer une pièce déposée, membres uniquement. */
export async function getRequestFileUrl(
  requestId: string
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const { supabase } = await requireUser();
  const { data: req } = await supabase
    .from("document_requests")
    .select("file_path, file_name")
    .eq("id", requestId)
    .maybeSingle<{ file_path: string | null; file_name: string | null }>();
  if (!req?.file_path) return { ok: false, message: "Aucun fichier déposé." };

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(req.file_path, 60, { download: req.file_name ?? true });
  if (error || !data?.signedUrl) {
    return { ok: false, message: "Téléchargement indisponible. Réessayez." };
  }
  return { ok: true, url: data.signedUrl };
}

/**
 * Dépôt d'une pièce depuis le portail public (sans compte).
 * 1. la RPC valide token + demande ouverte et renvoie le préfixe autorisé ;
 * 2. le chemin est construit ICI (jamais fourni par le client) ;
 * 3. upload anon borné par la policy Storage au préfixe de la demande ;
 * 4. la RPC finalise (vérifie la présence de l'objet, trace, notifie).
 */
export async function uploadPortalRequestAction(
  token: string,
  requestId: string,
  formData: FormData
): Promise<RequestActionResult & { fileName?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Sélectionnez un fichier." };
  }
  const invalid = validateFile(file, PORTAL_UPLOAD_MAX_BYTES);
  if (invalid) return { ok: false, message: invalid };

  const supabase = await createClient();
  const { data: prefix } = await supabase.rpc("get_portal_request_upload_prefix", {
    p_token: token,
    p_request_id: requestId,
  });
  if (!prefix || typeof prefix !== "string") {
    return { ok: false, message: "Cette demande n'accepte plus de dépôt." };
  }

  const path = `${prefix}${randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ok: false, message: "L'envoi a échoué. Réessayez." };

  const visitorId = clean(formData.get("visitor_id"), 64) || null;
  const { data: done } = await supabase.rpc("complete_portal_request", {
    p_token: token,
    p_request_id: requestId,
    p_file_path: path,
    p_file_name: file.name.slice(0, 200),
    p_file_size: file.size,
    p_file_type: file.type || null,
    p_visitor_id: visitorId,
  });
  if (!done) return { ok: false, message: "Dépôt non enregistré. Réessayez." };

  return { ok: true, fileName: file.name };
}
