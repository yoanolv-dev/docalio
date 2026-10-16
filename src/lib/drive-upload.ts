"use client";

// Upload direct : le fichier part du navigateur vers le Storage Supabase
// (bucket privé, RLS), puis la Server Action `registerUploadAction` crée la
// ligne `documents` via la RPC `drive_register_upload`. Avantages : aucune
// limite liée au serveur Next, remplacement versionné, et gros fichiers
// (jusqu'à la limite du plan) sans transit intermédiaire.

import { createClient } from "@/lib/supabase/client";
import { registerUploadAction } from "@/lib/actions/drive";
import { sanitizeFileName } from "@/lib/files";

const STORAGE_BUCKET = "documents";

export type DirectUploadResult =
  | { ok: true; id: string; version: number; replaced: boolean }
  | { ok: false; message: string };

export async function uploadFileDirect(input: {
  organizationId: string;
  workspaceId: string;
  folderId: string | null;
  file: File;
  /** Remplace un fichier existant (l'ancienne version est archivée). */
  replaceDocumentId?: string;
}): Promise<DirectUploadResult> {
  const supabase = createClient();
  const safeName = sanitizeFileName(input.file.name);
  const path = `organizations/${input.organizationId}/workspaces/${input.workspaceId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    const msg = uploadError.message?.toLowerCase() ?? "";
    if (msg.includes("exceeded") || msg.includes("maximum allowed size")) {
      return { ok: false, message: "Fichier trop volumineux pour le stockage." };
    }
    if (msg.includes("row-level security") || msg.includes("unauthorized")) {
      return { ok: false, message: "Accès en lecture seule sur cet espace." };
    }
    return { ok: false, message: "L'envoi du fichier a échoué. Réessayez." };
  }

  return registerUploadAction({
    workspaceId: input.workspaceId,
    folderId: input.folderId,
    path,
    name: input.file.name.replace(/\.[^.]+$/, "") || input.file.name,
    type: input.file.type || null,
    replaceDocumentId: input.replaceDocumentId ?? null,
  });
}
