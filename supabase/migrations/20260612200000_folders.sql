-- =============================================================================
-- Docalio — Sprint 14 — Dossiers (Drive type explorateur)
-- Table folders (imbriquée) + colonne documents.folder_id.
-- Permet une organisation « comme un ordinateur » : dossiers, sous-dossiers,
-- déplacement, copie, suppression. Additif et rétro-compatible (main ignore
-- ces objets : aucune régression). À appliquer manuellement sur Supabase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table folders
--   Deux contraintes d'intégrité composites garantissent au niveau base :
--     • un dossier appartient à une seule organisation (id, organization_id)
--     • un dossier appartient à un seul workspace      (id, workspace_id)
--   Le parent et les documents référencent (… , workspace_id) → impossible de
--   ranger un document/dossier dans un dossier d'un autre espace ou d'une autre
--   organisation, même en cas de bug applicatif.
-- -----------------------------------------------------------------------------
create table if not exists public.folders (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  parent_id        uuid,
  name             text not null check (char_length(name) between 1 and 120),
  -- Position sur le canvas spatial (px monde, relatives au dossier parent).
  pos_x            double precision,
  pos_y            double precision,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Le workspace doit appartenir à la même organisation.
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

-- Colonnes de position (idempotent si la table préexiste).
alter table public.folders add column if not exists pos_x double precision;
alter table public.folders add column if not exists pos_y double precision;

-- Index uniques nécessaires aux FK composites ci-dessous.
create unique index if not exists folders_id_workspace_id_uidx
  on public.folders (id, workspace_id);
create unique index if not exists folders_id_organization_id_uidx
  on public.folders (id, organization_id);

create index if not exists folders_workspace_id_idx on public.folders (workspace_id);
create index if not exists folders_parent_id_idx on public.folders (parent_id);
create index if not exists folders_organization_id_idx on public.folders (organization_id);

-- Le dossier parent doit être dans le même workspace (donc même organisation).
-- Ajoutée après création de l'index unique requis.
alter table public.folders
  drop constraint if exists folders_parent_same_workspace_fk;
alter table public.folders
  add constraint folders_parent_same_workspace_fk
  foreign key (parent_id, workspace_id)
  references public.folders (id, workspace_id) on delete cascade;

-- updated_at automatique (réutilise la fonction du Sprint 2).
drop trigger if exists set_folders_updated_at on public.folders;
create trigger set_folders_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS folders : isolation stricte par organisation (même schéma que documents).
-- -----------------------------------------------------------------------------
alter table public.folders enable row level security;

drop policy if exists folders_select_member on public.folders;
create policy folders_select_member on public.folders
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists folders_insert_member on public.folders;
create policy folders_insert_member on public.folders
  for insert to authenticated
  with check (
    organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

drop policy if exists folders_update_member on public.folders;
create policy folders_update_member on public.folders
  for update to authenticated
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists folders_delete_member on public.folders;
create policy folders_delete_member on public.folders
  for delete to authenticated
  using (organization_id in (select public.current_user_org_ids()));

-- -----------------------------------------------------------------------------
-- documents.folder_id : rattachement d'un document à un dossier (optionnel).
-- FK composite (folder_id, workspace_id) → le dossier est forcément dans le
-- même espace que le document. on delete cascade : supprimer un dossier
-- supprime les lignes documents qu'il contient (le nettoyage Storage est fait
-- côté serveur avant la suppression).
-- -----------------------------------------------------------------------------
alter table public.documents
  add column if not exists folder_id uuid;

alter table public.documents
  drop constraint if exists documents_folder_same_workspace_fk;
alter table public.documents
  add constraint documents_folder_same_workspace_fk
  foreign key (folder_id, workspace_id)
  references public.folders (id, workspace_id) on delete cascade;

create index if not exists documents_folder_id_idx on public.documents (folder_id);

-- Position des documents sur le canvas spatial (px monde, relatives au dossier).
alter table public.documents add column if not exists pos_x double precision;
alter table public.documents add column if not exists pos_y double precision;

-- -----------------------------------------------------------------------------
-- RPC publique get_portal : on ajoute folder_id à chaque document et la liste
-- des dossiers (visibles) pour permettre une navigation claire côté portail.
-- Seuls les dossiers contenant au moins un document visible (directement ou via
-- un sous-dossier) sont exposés. Le reste de la RPC est inchangé.
-- -----------------------------------------------------------------------------
create or replace function public.get_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_link     public.share_links;
  v_org      public.organizations;
  v_ws       public.workspaces;
  v_docs     jsonb;
  v_folders  jsonb;
begin
  select * into v_link
  from public.share_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now());

  if not found then
    return null;
  end if;

  select * into v_org from public.organizations where id = v_link.organization_id;
  select * into v_ws from public.workspaces where id = v_link.workspace_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'title', d.title,
        'description', d.description,
        'category', d.category,
        'file_type', d.file_type,
        'file_size', d.file_size,
        'status', d.status,
        'folder_id', d.folder_id,
        'allow_download', d.allow_download,
        'created_at', d.created_at
      )
      order by d.created_at desc
    ),
    '[]'::jsonb
  )
  into v_docs
  from public.documents d
  where d.workspace_id = v_link.workspace_id
    and d.is_visible_to_client;

  -- Dossiers menant à au moins un document visible (remontée des ancêtres).
  with visible_docs as (
    select distinct folder_id
    from public.documents
    where workspace_id = v_link.workspace_id
      and is_visible_to_client
      and folder_id is not null
  ),
  reachable as (
    select f.id, f.parent_id, f.name
    from public.folders f
    where f.id in (select folder_id from visible_docs)
    union
    select p.id, p.parent_id, p.name
    from public.folders p
    join reachable r on r.parent_id = p.id
  )
  select coalesce(
    jsonb_agg(distinct jsonb_build_object(
      'id', id,
      'parent_id', parent_id,
      'name', name
    )),
    '[]'::jsonb
  )
  into v_folders
  from reachable;

  return jsonb_build_object(
    'organization', jsonb_build_object(
      'name', v_org.name,
      'logo_url', v_org.logo_url,
      'primary_color', v_org.primary_color
    ),
    'workspace', jsonb_build_object(
      'name', v_ws.name,
      'client_company', v_ws.client_company
    ),
    'folders', v_folders,
    'documents', v_docs
  );
end;
$$;

revoke all on function public.get_portal(text) from public;
grant execute on function public.get_portal(text) to anon, authenticated;
