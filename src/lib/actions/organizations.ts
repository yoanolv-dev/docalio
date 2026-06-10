"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export type FormState = { ok: boolean; message?: string } | null;

/**
 * Onboarding : crée (si besoin) le profil, l'organisation et le membership
 * owner via la RPC atomique create_organization, puis redirige vers /dashboard.
 */
export async function createOrganizationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const color = String(formData.get("primary_color") ?? "").trim() || null;

  if (!name) return { ok: false, message: "Le nom de l'organisation est requis." };

  const slug = slugify(slugInput || name);
  if (!slug) {
    return {
      ok: false,
      message: "Le slug est invalide. Utilisez des lettres ou des chiffres.",
    };
  }

  // Filet de sécurité : le trigger on_auth_user_created crée normalement le
  // profil à l'inscription, mais on s'assure de sa présence (idempotent).
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    { onConflict: "id" }
  );

  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
    org_slug: slug,
    org_color: color,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "Ce slug est déjà utilisé. Choisissez-en un autre.",
      };
    }
    return {
      ok: false,
      message: "Impossible de créer l'organisation. Veuillez réessayer.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Paramètres : met à jour l'organisation. La RLS (organizations_update_admin)
 * garantit que seuls owner/admin peuvent écrire.
 */
export async function updateOrganizationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const organizationId = String(formData.get("organization_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? "").trim());
  const logoUrl = String(formData.get("logo_url") ?? "").trim() || null;
  const color = String(formData.get("primary_color") ?? "").trim() || null;

  if (!organizationId) return { ok: false, message: "Organisation introuvable." };
  if (!name) return { ok: false, message: "Le nom est requis." };
  if (!slug) return { ok: false, message: "Le slug est invalide." };

  const { error } = await supabase
    .from("organizations")
    .update({ name, slug, logo_url: logoUrl, primary_color: color })
    .eq("id", organizationId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Ce slug est déjà utilisé." };
    }
    return {
      ok: false,
      message: "Mise à jour impossible. Droits insuffisants ou erreur serveur.",
    };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Modifications enregistrées." };
}
