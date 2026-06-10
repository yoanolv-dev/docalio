// Types applicatifs reflétant le schéma Supabase (Sprint 2).
// Volontairement légers : pas de génération automatique pour rester simple.

export type OrganizationRole = "owner" | "admin" | "member";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
}

export type WorkspaceStatus = "prospect" | "active" | "archived";

export type DocumentStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "downloaded"
  | "approved"
  | "rejected"
  | "archived";

export interface Document {
  id: string;
  organization_id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_url: string | null;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: DocumentStatus;
  allow_download: boolean;
  is_visible_to_client: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: WorkspaceStatus;
  internal_note: string | null;
  logo_url: string | null;
  primary_color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
