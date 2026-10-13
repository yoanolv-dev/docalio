import { createClient } from "@/lib/supabase/server";
import { getPeopleNames } from "@/lib/drive";
import type { DriveLink } from "@/lib/types/database";

export interface OrgLink extends DriveLink {
  target_kind: "file" | "folder" | "space";
  target_name: string;
  target_mime: string | null;
  workspace_name: string;
  created_by_name: string | null;
  /** Lien encore utilisable (actif et non expiré). */
  live: boolean;
}

/** Liens de partage de l'organisation active (RLS : espaces accessibles). */
export async function listOrgLinks(organizationId: string): Promise<OrgLink[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drive_links")
    .select("*, workspaces(name), folders(name), documents(title, file_type)")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(300);

  type Row = DriveLink & {
    workspaces: { name: string } | null;
    folders: { name: string } | null;
    documents: { title: string; file_type: string | null } | null;
  };
  const rows = (data ?? []) as Row[];
  const people = await getPeopleNames(rows.map((r) => r.created_by));
  const now = Date.now();

  return rows.map(({ workspaces, folders, documents, ...link }) => ({
    ...link,
    target_kind: link.document_id ? "file" : link.folder_id ? "folder" : "space",
    target_name: documents?.title ?? folders?.name ?? workspaces?.name ?? "Élément",
    target_mime: documents?.file_type ?? null,
    workspace_name: workspaces?.name ?? "Espace",
    created_by_name: link.created_by ? people[link.created_by] ?? null : null,
    live: !link.expires_at || new Date(link.expires_at).getTime() > now,
  }));
}
