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
