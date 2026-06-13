-- =============================================================================
-- Docalio — Repositionnement « interne & externe »
--
-- 1) Profil d'organisation : secteur d'activité + usage principal. Sert à
--    personnaliser le vocabulaire et les modèles de dossiers (onboarding).
-- 2) Type d'espace : un espace est désormais soit INTERNE (équipe), soit
--    EXTERNE (partage client via lien). Par défaut « external » → comportement
--    actuel inchangé pour les données existantes.
--
-- Aucune logique de sécurité modifiée ici : la RLS reste l'isolation par
-- organisation. Le contrôle d'accès interne par groupe/espace arrivera dans une
-- migration dédiée (phase 2).
-- =============================================================================

-- Profil d'organisation -------------------------------------------------------
alter table public.organizations
  add column if not exists sector text;

alter table public.organizations
  add column if not exists usage_type text not null default 'external'
  check (usage_type in ('internal', 'external', 'mixed'));

-- Type d'espace ---------------------------------------------------------------
alter table public.workspaces
  add column if not exists space_type text not null default 'external'
  check (space_type in ('internal', 'external'));

create index if not exists workspaces_space_type_idx
  on public.workspaces (space_type);
