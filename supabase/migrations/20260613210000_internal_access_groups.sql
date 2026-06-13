-- =============================================================================
-- Docalio — Phase 2 : groupes d'utilisateurs + accès interne par espace
--
-- Objectif : un admin peut décider, en temps réel, quels utilisateurs/groupes
-- internes accèdent à quel espace. La RLS devient « par espace accessible »
-- pour workspaces / documents / folders / share_links.
--
-- Modèle de visibilité (aucune fuite inter-organisation, ni inter-utilisateur) :
--   - Espace EXTERNE  → visible par tous les membres de l'organisation
--                       (comportement actuel inchangé : les espaces existants
--                        sont tous externes → aucune régression).
--   - Espace INTERNE  → visible par : owner/admin, le créateur, et les
--                       utilisateurs/groupes explicitement autorisés.
--
-- Les RPC du portail restent SECURITY DEFINER : le portail client externe
-- n'est pas affecté.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table if not exists public.organization_groups (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);
create index if not exists organization_groups_org_idx
  on public.organization_groups (organization_id);

create table if not exists public.organization_group_members (
  group_id         uuid not null references public.organization_groups (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists org_group_members_user_idx
  on public.organization_group_members (user_id);
create index if not exists org_group_members_org_idx
  on public.organization_group_members (organization_id);

-- Autorisation d'accès à un espace : par groupe OU par utilisateur (exactement un).
create table if not exists public.workspace_access (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  workspace_id     uuid not null,
  group_id         uuid references public.organization_groups (id) on delete cascade,
  user_id          uuid references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  check (num_nonnulls(group_id, user_id) = 1),
  -- L'espace doit appartenir à la même organisation (intégrité au niveau base).
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);
create index if not exists workspace_access_ws_idx
  on public.workspace_access (workspace_id);
create unique index if not exists workspace_access_ws_group_uidx
  on public.workspace_access (workspace_id, group_id) where group_id is not null;
create unique index if not exists workspace_access_ws_user_uidx
  on public.workspace_access (workspace_id, user_id) where user_id is not null;

-- -----------------------------------------------------------------------------
-- Fonction : espaces accessibles à l'utilisateur courant (SECURITY DEFINER →
-- pas de récursion RLS). Source de vérité de la visibilité par espace.
-- -----------------------------------------------------------------------------
create or replace function public.accessible_workspace_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select w.id
  from public.workspaces w
  where w.organization_id in (select public.current_user_org_ids())
    and (
      w.space_type = 'external'
      or public.is_org_admin(w.organization_id)
      or w.created_by = auth.uid()
      or exists (
        select 1
        from public.workspace_access wa
        where wa.workspace_id = w.id
          and (
            wa.user_id = auth.uid()
            or wa.group_id in (
              select gm.group_id
              from public.organization_group_members gm
              where gm.user_id = auth.uid()
            )
          )
      )
    )
$$;
revoke all on function public.accessible_workspace_ids() from public, anon;
grant execute on function public.accessible_workspace_ids() to authenticated;

-- -----------------------------------------------------------------------------
-- RLS des nouvelles tables
-- -----------------------------------------------------------------------------
alter table public.organization_groups enable row level security;
alter table public.organization_group_members enable row level security;
alter table public.workspace_access enable row level security;

-- Lecture par les membres de l'organisation ; écriture réservée aux admins.
drop policy if exists groups_select_member on public.organization_groups;
create policy groups_select_member on public.organization_groups
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists groups_write_admin on public.organization_groups;
create policy groups_write_admin on public.organization_groups
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists group_members_select_member on public.organization_group_members;
create policy group_members_select_member on public.organization_group_members
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists group_members_write_admin on public.organization_group_members;
create policy group_members_write_admin on public.organization_group_members
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists workspace_access_select_member on public.workspace_access;
create policy workspace_access_select_member on public.workspace_access
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists workspace_access_write_admin on public.workspace_access;
create policy workspace_access_write_admin on public.workspace_access
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- Réécriture des RLS « par espace accessible »
--   workspaces / documents / folders / share_links
-- Les anciennes policies « org-scoped » sont remplacées (même nom).
-- -----------------------------------------------------------------------------

-- workspaces : SELECT/UPDATE/DELETE par espace accessible. INSERT inchangé
-- (tout membre peut créer un espace ; il en devient créateur → accès garanti).
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (id in (select public.accessible_workspace_ids()));

drop policy if exists workspaces_update_member on public.workspaces;
create policy workspaces_update_member on public.workspaces
  for update to authenticated
  using (id in (select public.accessible_workspace_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists workspaces_delete_member on public.workspaces;
create policy workspaces_delete_member on public.workspaces
  for delete to authenticated
  using (id in (select public.accessible_workspace_ids()));

-- documents : toutes opérations sur un espace accessible.
drop policy if exists documents_select_member on public.documents;
create policy documents_select_member on public.documents
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists documents_insert_member on public.documents;
create policy documents_insert_member on public.documents
  for insert to authenticated
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and created_by = auth.uid()
  );

drop policy if exists documents_update_member on public.documents;
create policy documents_update_member on public.documents
  for update to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()))
  with check (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists documents_delete_member on public.documents;
create policy documents_delete_member on public.documents
  for delete to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

-- folders : idem documents.
drop policy if exists folders_select_member on public.folders;
create policy folders_select_member on public.folders
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists folders_insert_member on public.folders;
create policy folders_insert_member on public.folders
  for insert to authenticated
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and created_by = auth.uid()
  );

drop policy if exists folders_update_member on public.folders;
create policy folders_update_member on public.folders
  for update to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()))
  with check (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists folders_delete_member on public.folders;
create policy folders_delete_member on public.folders
  for delete to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

-- share_links : un lien ne se gère que pour un espace accessible (en pratique
-- les liens concernent des espaces externes, toujours accessibles).
drop policy if exists share_links_select_member on public.share_links;
create policy share_links_select_member on public.share_links
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists share_links_insert_member on public.share_links;
create policy share_links_insert_member on public.share_links
  for insert to authenticated
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and created_by = auth.uid()
  );

drop policy if exists share_links_update_member on public.share_links;
create policy share_links_update_member on public.share_links
  for update to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()))
  with check (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists share_links_delete_member on public.share_links;
create policy share_links_delete_member on public.share_links
  for delete to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));
