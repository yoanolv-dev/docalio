"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";

const BRAND_BUCKET = "brand";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 Mo

// Logos uniquement : images matricielles sûres (pas de SVG — risque XSS).
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type LogoUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Téléverse un logo (org ou espace client) dans le bucket public `brand` et
 * renvoie son URL publique stable. Le bucket `documents` (fichiers clients)
 * n'est jamais touché : il reste privé. L'écriture est cadrée par RLS au
 * dossier de l'organisation du membre — aucune écriture inter-organisation.
 *
 * `scope` (org | new | workspace_id) sert uniquement à nommer le fichier.
 * `previous_url` (optionnel) : ancien logo de notre bucket → nettoyé en
 * meilleur effort pour ne pas accumuler d'orphelins.
 */
export async function uploadBrandLogoAction(
  formData: FormData
): Promise<LogoUploadResult> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return { ok: false, message: "Session expirée. Reconnectez-vous." };
  }
  // Seuls les administrateurs gèrent l'identité de marque.
  if (membership.role === "member") {
    return { ok: false, message: "Action réservée aux administrateurs." };
  }

  const orgId = membership.organization.id;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Sélectionnez une image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, message: "Image trop lourde (2 Mo maximum)." };
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return { ok: false, message: "Format accepté : PNG, JPG ou WebP." };
  }

  const supabase = await createClient();

  const scope = (String(formData.get("scope") ?? "org").trim() || "org")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .slice(0, 40);
  const path = `organizations/${orgId}/${scope}-${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BRAND_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { ok: false, message: "L'envoi a échoué. Réessayez." };
  }

  const { data } = supabase.storage.from(BRAND_BUCKET).getPublicUrl(path);
  const url = data.publicUrl;
  if (!url) {
    return { ok: false, message: "URL du logo introuvable. Réessayez." };
  }

  // Nettoyage meilleur effort de l'ancien logo (s'il vient de notre bucket et
  // de cette organisation — jamais d'autres fichiers).
  const previous = String(formData.get("previous_url") ?? "").trim();
  if (previous && previous !== url) {
    const marker = `/${BRAND_BUCKET}/organizations/${orgId}/`;
    const idx = previous.indexOf(marker);
    if (idx !== -1) {
      const oldPath = previous.slice(idx + `/${BRAND_BUCKET}/`.length);
      await supabase.storage.from(BRAND_BUCKET).remove([oldPath]);
    }
  }

  return { ok: true, url };
}
