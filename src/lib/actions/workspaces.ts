"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { getOrganizationUsage } from "@/lib/usage";
import { isLimitReached, resolvePlan } from "@/lib/plans";
import type {
  Organization,
  SpaceType,
  WorkspaceStatus,
} from "@/lib/types/database";

export type WorkspaceFormState = { ok: boolean; message?: string } | null;

const STATUSES: WorkspaceStatus[] = ["prospect", "active", "archived"];

function readSpaceType(formData: FormData): SpaceType {
  return text(formData, "space_type") === "internal" ? "internal" : "external";
}

/**
 * Modèle de dossiers à pré-créer (champ « folders » : noms séparés par « | »).
 * Les espaces sont créés vides par défaut ; ce modèle accélère la mise en place
 * selon le secteur. Best-effort : un échec de seed n'annule pas la création.
 */
async function seedFolders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: {
    organizationId: string;
    workspaceId: string;
    createdBy: string;
    raw: string;
  }
): Promise<void> {
  const names = args.raw
    .split("|")
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && n.length <= 120)
    .slice(0, 12);
  if (names.length === 0) return;

  await supabase.from("folders").insert(
    names.map((name) => ({
      organization_id: args.organizationId,
      workspace_id: args.workspaceId,
      parent_id: null,
      name,
      created_by: args.createdBy,
    }))
  );
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function nullable(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

/** Normalise un identifiant d'URL (sous-domaine) : minuscules, a-z0-9-, borné. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Lit + valide le slug du formulaire. Retourne { slug } ou { error }. */
function readSlug(formData: FormData): { slug: string | null; error?: string } {
  const raw = text(formData, "slug");
  if (!raw) return { slug: null };
  const slug = slugify(raw);
  if (slug.length < 2) {
    return {
      slug: null,
      error: "Identifiant d'URL invalide (lettres, chiffres et tirets, 2 min.).",
    };
  }
  return { slug };
}

/**
 * Vérifie le quota d'espaces clients actifs du plan. Retourne un message
 * d'erreur si la limite est atteinte, ou `null` si l'opération est autorisée.
 * L'espace candidat n'étant pas encore compté comme actif, on bloque dès que le
 * nombre d'actifs existants atteint la limite.
 */
async function activeWorkspaceLimitError(
  organization: Pick<Organization, "plan"> | null,
  orgId: string
): Promise<string | null> {
  const plan = resolvePlan(organization);
  const limit = plan.limits.activeWorkspaces;
  if (limit === null) return null;

  const usage = await getOrganizationUsage(orgId);
  if (isLimitReached(usage.activeWorkspaces, limit)) {
    const plural = limit > 1 ? "s" : "";
    return `Limite atteinte : votre plan ${plan.name} autorise ${limit} espace${plural} client${plural} actif${plural}. Archivez un espace existant ou passez à un plan supérieur.`;
  }
  return null;
}

export async function createWorkspaceAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Le nom de l'espace est requis." };

  const status = text(formData, "status") as WorkspaceStatus;
  if (!STATUSES.includes(status)) {
    return { ok: false, message: "Statut invalide." };
  }

  // Limite du plan : nombre d'espaces clients actifs.
  if (status === "active") {
    const limitError = await activeWorkspaceLimitError(
      membership.organization,
      membership.organization.id
    );
    if (limitError) return { ok: false, message: limitError };
  }

  const { slug, error: slugError } = readSlug(formData);
  if (slugError) return { ok: false, message: slugError };

  const spaceType = readSpaceType(formData);
  // Les champs « client » (société, contact, branding, sous-domaine) n'ont de
  // sens que pour un espace externe. Un espace interne les ignore.
  const isExternal = spaceType === "external";

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      organization_id: membership.organization.id,
      created_by: user.id,
      name,
      space_type: spaceType,
      slug: isExternal ? slug : null,
      client_company: isExternal ? nullable(formData, "client_company") : null,
      client_email: isExternal ? nullable(formData, "client_email") : null,
      client_phone: isExternal ? nullable(formData, "client_phone") : null,
      status,
      logo_url: isExternal ? nullable(formData, "logo_url") : null,
      primary_color: nullable(formData, "primary_color"),
      internal_note: nullable(formData, "internal_note"),
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        message: "Ce sous-domaine est déjà utilisé. Choisissez-en un autre.",
      };
    }
    return { ok: false, message: "Création impossible. Veuillez réessayer." };
  }

  await seedFolders(supabase, {
    organizationId: membership.organization.id,
    workspaceId: data.id,
    createdBy: user.id,
    raw: text(formData, "folders"),
  });

  revalidatePath("/dashboard/workspaces");
  revalidatePath("/dashboard");
  redirect(`/dashboard/workspaces/${data.id}`);
}

export async function updateWorkspaceAction(
  _prev: WorkspaceFormState,
  formData: FormData
): Promise<WorkspaceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = text(formData, "workspace_id");
  if (!id) return { ok: false, message: "Espace introuvable." };

  const name = text(formData, "name");
  if (!name) return { ok: false, message: "Le nom de l'espace est requis." };

  const status = text(formData, "status") as WorkspaceStatus;
  if (!STATUSES.includes(status)) {
    return { ok: false, message: "Statut invalide." };
  }

  // Limite du plan : on ne contrôle que le passage *vers* « actif » (réactiver
  // un espace archivé). Un espace déjà actif qu'on modifie reste autorisé.
  if (status === "active") {
    const { data: current } = await supabase
      .from("workspaces")
      .select("status, organization_id")
      .eq("id", id)
      .maybeSingle<{ status: WorkspaceStatus; organization_id: string }>();

    if (current && current.status !== "active") {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, plan")
        .eq("id", current.organization_id)
        .maybeSingle<Pick<Organization, "id" | "plan">>();
      const limitError = await activeWorkspaceLimitError(
        org,
        current.organization_id
      );
      if (limitError) return { ok: false, message: limitError };
    }
  }

  const { slug, error: slugError } = readSlug(formData);
  if (slugError) return { ok: false, message: slugError };

  const spaceType = readSpaceType(formData);
  const isExternal = spaceType === "external";

  const { error } = await supabase
    .from("workspaces")
    .update({
      name,
      space_type: spaceType,
      slug: isExternal ? slug : null,
      client_company: isExternal ? nullable(formData, "client_company") : null,
      client_email: isExternal ? nullable(formData, "client_email") : null,
      client_phone: isExternal ? nullable(formData, "client_phone") : null,
      status,
      logo_url: isExternal ? nullable(formData, "logo_url") : null,
      primary_color: nullable(formData, "primary_color"),
      internal_note: nullable(formData, "internal_note"),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "Ce sous-domaine est déjà utilisé. Choisissez-en un autre.",
      };
    }
    return { ok: false, message: "Mise à jour impossible. Veuillez réessayer." };
  }

  revalidatePath("/dashboard/workspaces");
  revalidatePath(`/dashboard/workspaces/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Modifications enregistrées." };
}

/** Archive (status = archived) — appelée depuis un <form action>. */
export async function archiveWorkspaceAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = text(formData, "workspace_id");
  if (!id) return;

  await supabase.from("workspaces").update({ status: "archived" }).eq("id", id);

  revalidatePath("/dashboard/workspaces");
  revalidatePath(`/dashboard/workspaces/${id}`);
  revalidatePath("/dashboard");
}

/**
 * Suppression définitive — appelée depuis un <form action>.
 * Les documents sont supprimés en cascade (FK) ; on nettoie aussi les
 * fichiers Storage du workspace pour ne pas laisser d'orphelins.
 */
export async function deleteWorkspaceAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = text(formData, "workspace_id");
  if (!id) return;

  // Lecture via RLS : hors organisation → introuvable, rien n'est supprimé.
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", id)
    .maybeSingle<{ id: string; organization_id: string }>();
  if (!workspace) return;

  const prefix = `organizations/${workspace.organization_id}/workspaces/${workspace.id}`;
  const { data: files } = await supabase.storage.from("documents").list(prefix);
  if (files && files.length > 0) {
    await supabase.storage
      .from("documents")
      .remove(files.map((f) => `${prefix}/${f.name}`));
  }

  await supabase.from("workspaces").delete().eq("id", id);

  revalidatePath("/dashboard/workspaces");
  revalidatePath("/dashboard");
  redirect("/dashboard/workspaces");
}

export type QuickCreateResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/**
 * Création express : un espace prêt à l'emploi en une seule action.
 * Crée l'espace (actif), son lien client sans expiration (plus d'étape
 * « activer le portail ») et les pièces demandées choisies. Le lien et les
 * pièces sont best-effort : un échec n'annule pas l'espace, l'utilisateur peut
 * les ajouter ensuite depuis la page.
 */
export async function quickCreateWorkspaceAction(input: {
  name: string;
  clientEmail?: string;
  pieces?: string[];
}): Promise<QuickCreateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  const org = membership.organization;

  const name = String(input.name ?? "").trim().slice(0, 120);
  if (!name) return { ok: false, message: "Indiquez le nom du client." };

  const email = String(input.clientEmail ?? "").trim().slice(0, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Adresse e-mail invalide." };
  }

  const limitError = await activeWorkspaceLimitError(org, org.id);
  if (limitError) return { ok: false, message: limitError };

  // Usage purement interne : un espace d'équipe, sans lien ni pièces.
  const internal = org.usage_type === "internal";

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      organization_id: org.id,
      created_by: user.id,
      name,
      space_type: internal ? "internal" : "external",
      client_company: internal ? null : name,
      client_email: internal ? null : email || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, message: "Création impossible. Veuillez réessayer." };
  }

  if (!internal) {
    const { randomBytes } = await import("node:crypto");
    await supabase.from("share_links").insert({
      organization_id: org.id,
      workspace_id: data.id,
      token: randomBytes(24).toString("base64url"),
      expires_at: null,
      created_by: user.id,
    });

    const pieces = (input.pieces ?? [])
      .map((p) => String(p).trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 30);
    if (pieces.length > 0) {
      await supabase.from("document_requests").insert(
        pieces.map((title, i) => ({
          organization_id: org.id,
          workspace_id: data.id,
          title,
          position: i,
          created_by: user.id,
        }))
      );
    }
  }

  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}
