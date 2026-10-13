import { cookies } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";

// Lecture d'un lien de partage public (page /s/{jeton}).

export interface PublicLinkFolder {
  id: string;
  name: string;
  updated_at: string;
  items: number;
}

export interface PublicLinkFile {
  id: string;
  name: string;
  file_type: string | null;
  file_size: number | null;
  updated_at: string;
}

export interface PublicLinkBrand {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  plan: string;
}

export type PublicLinkData =
  | { status: "invalid" }
  | { status: "password" | "locked"; organization: PublicLinkBrand }
  | {
      status: "ok";
      organization: PublicLinkBrand;
      link: { can_view: boolean; can_download: boolean; can_upload: boolean; expires_at: string | null; label: string | null };
      root: { kind: "file" | "folder" | "space"; name: string; id?: string };
      folder_id: string | null;
      breadcrumb: { id: string; name: string }[];
      folders: PublicLinkFolder[];
      files: PublicLinkFile[];
    };

/** Nom du cookie de session d'un lien protégé (un par lien). */
export function linkSessionCookie(token: string): string {
  return `dl_${token.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24)}`;
}

export async function readLinkSession(token: string): Promise<string | null> {
  const store = await cookies();
  return store.get(linkSessionCookie(token))?.value ?? null;
}

export async function getPublicLink(token: string, folderId: string | null): Promise<PublicLinkData> {
  const supabase = createPublicClient();
  const session = await readLinkSession(token);
  const { data, error } = await supabase.rpc("link_get", {
    p_token: token,
    p_session: session,
    p_folder_id: folderId,
  });
  if (error || !data) return { status: "invalid" };
  return data as PublicLinkData;
}
