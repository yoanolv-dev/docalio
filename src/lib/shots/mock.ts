// Données fictives réalistes pour générer les captures produit (marketing).
// Scénario : « Studio Hélène Roy » (studio de design) × client « Boulangerie Margot ».
// Aucune donnée réelle, aucun logo tiers.

import type {
  Document,
  Folder,
  PortalDocument,
  PortalFolder,
  DocumentDecision,
} from "@/lib/types/database";
import type { WorkspaceListItem } from "@/lib/workspaces";

const ORG = "org-demo";
const WS = "ws-demo";

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// Date absolue figée : utilisée là où l'affichage est une date complète
// (et non un « il y a … »). Une valeur constante garantit un rendu identique
// au build et à l'hydratation des aperçus live du site (pas de décalage de jour).
const FIXED_DATE = "2026-06-09T09:00:00.000Z";

function doc(
  id: string,
  title: string,
  ext: string,
  size: number,
  opts: Partial<Document> = {}
): Document {
  return {
    id,
    organization_id: ORG,
    workspace_id: WS,
    folder_id: null,
    title,
    description: null,
    category: null,
    file_url: null,
    file_path: `organizations/${ORG}/workspaces/${WS}/${id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`,
    file_type: null,
    file_size: size,
    status: "sent",
    allow_download: true,
    is_visible_to_client: true,
    pos_x: null,
    pos_y: null,
    created_by: null,
    created_at: daysAgo(6),
    updated_at: daysAgo(6),
    ...opts,
  };
}

export const MOCK_FOLDERS: Folder[] = [
  { id: "f-contrats", organization_id: ORG, workspace_id: WS, parent_id: null, name: "Contrats", pos_x: 40, pos_y: 40, created_by: null, created_at: daysAgo(20), updated_at: daysAgo(20) },
  { id: "f-factures", organization_id: ORG, workspace_id: WS, parent_id: null, name: "Factures", pos_x: 268, pos_y: 40, created_by: null, created_at: daysAgo(20), updated_at: daysAgo(20) },
  { id: "f-creation", organization_id: ORG, workspace_id: WS, parent_id: null, name: "Création", pos_x: 496, pos_y: 40, created_by: null, created_at: daysAgo(18), updated_at: daysAgo(18) },
];

export const MOCK_DOCUMENTS: Document[] = [
  doc("d1", "Proposition commerciale", "pdf", 2_400_000, { folder_id: null, pos_x: 40, pos_y: 196 }),
  doc("d2", "Charte graphique — v3", "pdf", 8_900_000, { folder_id: "f-creation" }),
  doc("d3", "Logo — variantes", "png", 1_200_000, { folder_id: "f-creation", allow_download: false }),
  doc("d4", "Contrat de prestation", "docx", 540_000, { folder_id: "f-contrats" }),
  doc("d5", "Avenant — délais", "docx", 320_000, { folder_id: "f-contrats", is_visible_to_client: false }),
  doc("d6", "Facture 2026-014", "pdf", 180_000, { folder_id: "f-factures" }),
  doc("d7", "Devis signé", "pdf", 410_000, { folder_id: null, pos_x: 268, pos_y: 196 }),
];

export const MOCK_DECISIONS: Record<string, DocumentDecision> = {
  d4: { document_id: "d4", decision: "approved", comment: null },
  d1: { document_id: "d1", decision: "changes_requested", comment: "Peut-on revoir le planning de la phase 2 ?" },
};

export const MOCK_VIEWED = ["d1", "d2", "d6"];
export const MOCK_DOWNLOADED = ["d6"];

// ---- Portail (vue client) -----------------------------------------------------
export const MOCK_PORTAL_FOLDERS: PortalFolder[] = [
  { id: "f-contrats", parent_id: null, name: "Contrats" },
  { id: "f-creation", parent_id: null, name: "Création" },
  { id: "f-factures", parent_id: null, name: "Factures" },
];

function pdoc(
  id: string,
  title: string,
  folder_id: string | null,
  size: number,
  description: string | null = null
): PortalDocument {
  return {
    id,
    title,
    description,
    category: null,
    file_type: "application/pdf",
    file_size: size,
    status: "sent",
    folder_id,
    allow_download: true,
    created_at: FIXED_DATE,
  };
}

export const MOCK_PORTAL_DOCUMENTS: PortalDocument[] = [
  pdoc("d1", "Proposition commerciale", null, 2_400_000, "Le détail de notre accompagnement sur les 3 prochains mois."),
  pdoc("d2", "Charte graphique — v3", "f-creation", 8_900_000),
  pdoc("d4", "Contrat de prestation", "f-contrats", 540_000),
  pdoc("d6", "Facture 2026-014", "f-factures", 180_000),
];

export const MOCK_PORTAL_DECISIONS: Record<string, { decision: "approved" | "rejected" | "changes_requested"; comment: string | null }> = {
  d4: { decision: "approved", comment: null },
};

// ---- Dashboard (liste d'espaces) ---------------------------------------------
export const MOCK_WORKSPACES: WorkspaceListItem[] = [
  { id: "w1", organization_id: ORG, space_type: "external", name: "Boulangerie Margot", slug: "boulangerie-margot", client_company: "Boulangerie Margot", client_email: "contact@margot.fr", client_phone: null, status: "active", internal_note: null, logo_url: null, primary_color: "#d97706", created_by: null, created_at: daysAgo(30), updated_at: daysAgo(2), documentCount: 7, visibleCount: 6, hasActiveLink: true, pendingDecisions: 2, lastActivityAt: daysAgo(0) },
  { id: "w2", organization_id: ORG, space_type: "external", name: "Cabinet Lenoir", slug: "cabinet-lenoir", client_company: "Cabinet Lenoir & Associés", client_email: "j.lenoir@lenoir.fr", client_phone: null, status: "active", internal_note: null, logo_url: null, primary_color: "#1e3a8a", created_by: null, created_at: daysAgo(40), updated_at: daysAgo(5), documentCount: 12, visibleCount: 9, hasActiveLink: true, pendingDecisions: 0, lastActivityAt: daysAgo(1) },
  { id: "w3", organization_id: ORG, space_type: "external", name: "Atelier Bois&Co", slug: "atelier-bois-co", client_company: "Bois & Co", client_email: null, client_phone: null, status: "prospect", internal_note: null, logo_url: null, primary_color: "#047857", created_by: null, created_at: daysAgo(8), updated_at: daysAgo(8), documentCount: 3, visibleCount: 0, hasActiveLink: false, pendingDecisions: 0, lastActivityAt: null },
  { id: "w4", organization_id: ORG, space_type: "external", name: "Studio Photo Iris", slug: "studio-iris", client_company: "Iris Studio", client_email: "hello@iris.photo", client_phone: null, status: "active", internal_note: null, logo_url: null, primary_color: "#7c3aed", created_by: null, created_at: daysAgo(60), updated_at: daysAgo(10), documentCount: 21, visibleCount: 15, hasActiveLink: true, pendingDecisions: 1, lastActivityAt: daysAgo(3) },
  { id: "w5", organization_id: ORG, space_type: "external", name: "Pâtisserie Solène", slug: "patisserie-solene", client_company: "Solène", client_email: null, client_phone: null, status: "archived", internal_note: null, logo_url: null, primary_color: "#be123c", created_by: null, created_at: daysAgo(120), updated_at: daysAgo(90), documentCount: 9, visibleCount: 9, hasActiveLink: false, pendingDecisions: 0, lastActivityAt: null },
  { id: "w6", organization_id: ORG, space_type: "external", name: "Restaurant Nord", slug: "restaurant-nord", client_company: "Le Nord", client_email: "resa@lenord.fr", client_phone: null, status: "active", internal_note: null, logo_url: null, primary_color: "#0f766e", created_by: null, created_at: daysAgo(15), updated_at: daysAgo(1), documentCount: 5, visibleCount: 4, hasActiveLink: true, pendingDecisions: 3, lastActivityAt: daysAgo(0) },
];
