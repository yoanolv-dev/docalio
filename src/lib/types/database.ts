// Types applicatifs reflétant le schéma Supabase (Sprint 2).
// Volontairement légers : pas de génération automatique pour rester simple.

export type OrganizationRole = "owner" | "admin" | "member";

/** Plans d'abonnement (les limites vivent dans src/lib/plans.ts). */
export type OrganizationPlan = "starter" | "pro" | "business" | "enterprise";

/** État de l'abonnement. Géré côté serveur (facturation), pas via l'UI cliente. */
export type PlanStatus = "trial" | "active" | "suspended";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Usage principal déclaré à l'onboarding (pilote le vocabulaire de l'app). */
export type UsageType = "internal" | "external" | "mixed";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  /** Secteur d'activité (cf. src/lib/sectors.ts) — personnalisation. */
  sector: string | null;
  /** Usage principal : interne, externe (clients) ou les deux. */
  usage_type: UsageType;
  plan: OrganizationPlan;
  plan_status: PlanStatus;
  trial_ends_at: string | null;
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

/** Un espace est soit interne (équipe), soit externe (partage client). */
export type SpaceType = "internal" | "external";

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
  folder_id: string | null;
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
  /** Position sur le canvas spatial (null = auto-disposé). */
  pos_x: number | null;
  pos_y: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Dossier du Drive (arborescence par workspace). */
export interface Folder {
  id: string;
  organization_id: string;
  workspace_id: string;
  parent_id: string | null;
  name: string;
  /** Position sur le canvas spatial (null = auto-disposé). */
  pos_x: number | null;
  pos_y: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  /** Interne (équipe) ou externe (partage client). */
  space_type: SpaceType;
  /** Identifiant d'URL pour le sous-domaine de marque (ex. « margot »). */
  slug: string | null;
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

export interface ShareLink {
  id: string;
  organization_id: string;
  workspace_id: string;
  token: string;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/** Données publiques renvoyées par la RPC get_portal (aucune info sensible). */
export interface PortalDocument {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_type: string | null;
  file_size: number | null;
  status: DocumentStatus;
  folder_id: string | null;
  allow_download: boolean;
  created_at: string;
}

/** Dossier exposé au portail (uniquement ceux menant à un document visible). */
export interface PortalFolder {
  id: string;
  parent_id: string | null;
  name: string;
}

export interface PortalData {
  organization: {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  };
  workspace: {
    name: string;
    client_company: string | null;
    logo_url: string | null;
    primary_color: string | null;
    slug: string | null;
  };
  folders: PortalFolder[];
  documents: PortalDocument[];
}

export type DecisionType = "approved" | "rejected" | "changes_requested";

export interface DocumentDecision {
  document_id: string;
  decision: DecisionType;
  comment: string | null;
  updated_at?: string;
}

export type ActivityEventType =
  | "portal_opened"
  | "document_downloaded"
  | "document_opened";

export interface ActivityEvent {
  id: string;
  event_type: ActivityEventType;
  document_id: string | null;
  document_title: string | null;
  visitor_id: string | null;
  created_at: string;
}

export type NotificationType =
  | "portal_opened"
  | "document_downloaded"
  | "document_opened"
  | "decision_received";

/** Charge utile minimale d'une notification (le wording vit côté code). */
export interface NotificationMetadata {
  document_id?: string;
  document_title?: string | null;
  decision?: DecisionType;
  comment?: string | null;
}

/**
 * Notification interne d'organisation. Nommée `AppNotification` pour ne pas
 * masquer le type global `Notification` du DOM.
 */
export interface AppNotification {
  id: string;
  organization_id: string;
  workspace_id: string;
  type: NotificationType;
  metadata: NotificationMetadata;
  read_at: string | null;
  created_at: string;
  /** Nom du workspace lié (joint à la lecture). */
  workspace_name?: string | null;
}
