-- =============================================================================
-- Docalio — Drive Pro (consolidation)
--
-- Ce fichier reconstitue, en un seul bloc idempotent, les migrations
-- 20261013074545 → 20261013154133 déjà appliquées sur le projet Supabase
-- (sessions du 13/10/2026) : rôles & invités, corbeille, versions de fichiers,
-- quotas de stockage, audit d'activité, MFA, liens de partage par
-- fichier/dossier (mot de passe, expiration, dépôt public, ZIP) et portail
-- ignorant la corbeille.
--
-- Sur le projet de production, ces versions figurent déjà dans
-- supabase_migrations.schema_migrations : ce fichier n'y sera pas rejoué.
-- Sur un environnement neuf, il restaure l'intégralité de l'état.
-- =============================================================================

-- =============================================================================
-- 1. Rôles & accès — invités (guest), niveaux d'accès par espace
-- =============================================================================

alter table public.organization_members
  drop constraint if exists organization_members_role_check;
alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'member', 'guest'));

alter table public.organization_invites
  add column if not exists workspace_ids uuid[] not null default '{}',
  add column if not exists access_level text not null default 'editor';
alter table public.organization_invites
  drop constraint if exists organization_invites_role_check;
alter table public.organization_invites
  add constraint organization_invites_role_check
  check (role in ('admin', 'member', 'guest'));
alter table public.organization_invites
  drop constraint if exists organization_invites_access_level_check;
alter table public.organization_invites
  add constraint organization_invites_access_level_check
  check (access_level in ('viewer', 'editor'));

alter table public.workspace_access
  add column if not exists access_level text not null default 'editor';
alter table public.workspace_access
  drop constraint if exists workspace_access_access_level_check;
alter table public.workspace_access
  add constraint workspace_access_access_level_check
  check (access_level in ('viewer', 'editor'));

-- Les invités (guest) ne sont PAS membres pleins : exclus de current_user_org_ids.
create or replace function public.current_user_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
    and role <> 'guest';
$$;

-- Toutes les organisations, invités compris (menus de compte, invitations).
create or replace function public.current_user_all_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

create or replace function public.current_user_comember_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select distinct m.user_id
  from public.organization_members m
  where m.organization_id in (select public.current_user_org_ids())
  union
  select auth.uid() where auth.uid() is not null;
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_guest(org uuid, member uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = member and role = 'guest'
  );
$$;

-- Espaces visibles (p_write = false) ou modifiables (p_write = true) :
--   - membres : externes toujours, internes si admin/créateur/accès explicite ;
--   - invités : uniquement les espaces listés dans workspace_access.
create or replace function public.workspace_ids_for_current_user(p_write boolean)
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select w.id
  from public.workspaces w
  where (
      w.organization_id in (select public.current_user_org_ids())
      and (
        w.space_type = 'external'
        or public.is_org_admin(w.organization_id)
        or w.created_by = auth.uid()
        or exists (
          select 1
          from public.workspace_access wa
          where wa.workspace_id = w.id
            and (not p_write or wa.access_level = 'editor')
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
    )
    or exists (
      select 1
      from public.workspace_access wa
      join public.organization_members m
        on m.organization_id = wa.organization_id
       and m.user_id = auth.uid()
       and m.role = 'guest'
      where wa.workspace_id = w.id
        and wa.user_id = auth.uid()
        and (not p_write or wa.access_level = 'editor')
    );
$$;

create or replace function public.accessible_workspace_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select public.workspace_ids_for_current_user(false);
$$;

create or replace function public.writable_workspace_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select public.workspace_ids_for_current_user(true);
$$;

create or replace function public.can_write_workspace(p_workspace_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select p_workspace_id in (select public.writable_workspace_ids());
$$;

revoke all on function public.workspace_ids_for_current_user(boolean) from public, anon;
grant execute on function public.workspace_ids_for_current_user(boolean) to authenticated;
revoke all on function public.writable_workspace_ids() from public, anon;
grant execute on function public.writable_workspace_ids() to authenticated;
revoke all on function public.can_write_workspace(uuid) from public, anon;
grant execute on function public.can_write_workspace(uuid) to authenticated;
revoke all on function public.current_user_all_org_ids() from public, anon;
grant execute on function public.current_user_all_org_ids() to authenticated;
revoke all on function public.is_org_guest(uuid, uuid) from public, anon;
grant execute on function public.is_org_guest(uuid, uuid) to authenticated;

-- Policies principales (lecture via accessible, écriture via writable)
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (
    (
      organization_id in (select public.current_user_org_ids())
      and (
        space_type = 'external'
        or created_by = auth.uid()
        or public.is_org_admin(organization_id)
      )
    )
    or id in (select public.accessible_workspace_ids())
  );

drop policy if exists workspaces_update_member on public.workspaces;
create policy workspaces_update_member on public.workspaces
  for update to authenticated
  using (
    id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  )
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists workspaces_delete_member on public.workspaces;
create policy workspaces_delete_member on public.workspaces
  for delete to authenticated
  using (
    id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

drop policy if exists documents_select_member on public.documents;
create policy documents_select_member on public.documents
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists documents_insert_member on public.documents;
create policy documents_insert_member on public.documents
  for insert to authenticated
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and created_by = auth.uid()
  );

drop policy if exists documents_update_member on public.documents;
create policy documents_update_member on public.documents
  for update to authenticated
  using (workspace_id in (select public.writable_workspace_ids()))
  with check (workspace_id in (select public.writable_workspace_ids()));

drop policy if exists documents_delete_member on public.documents;
create policy documents_delete_member on public.documents
  for delete to authenticated
  using (workspace_id in (select public.writable_workspace_ids()));

drop policy if exists folders_select_member on public.folders;
create policy folders_select_member on public.folders
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists folders_insert_member on public.folders;
create policy folders_insert_member on public.folders
  for insert to authenticated
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and created_by = auth.uid()
  );

drop policy if exists folders_update_member on public.folders;
create policy folders_update_member on public.folders
  for update to authenticated
  using (workspace_id in (select public.writable_workspace_ids()))
  with check (workspace_id in (select public.writable_workspace_ids()));

drop policy if exists folders_delete_member on public.folders;
create policy folders_delete_member on public.folders
  for delete to authenticated
  using (workspace_id in (select public.writable_workspace_ids()));

drop policy if exists members_select_same_org on public.organization_members;
create policy members_select_same_org on public.organization_members
  for select to authenticated
  using (
    organization_id in (select public.current_user_org_ids())
    or user_id = auth.uid()
  );

drop policy if exists workspace_access_select_member on public.workspace_access;
create policy workspace_access_select_member on public.workspace_access
  for select to authenticated
  using (
    organization_id in (select public.current_user_org_ids())
    or user_id = auth.uid()
  );

drop policy if exists workspace_access_write_admin on public.workspace_access;
create policy workspace_access_write_admin on public.workspace_access
  for all to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Un membre peut gérer l'accès d'un INVITÉ sur un espace qu'il peut modifier.
drop policy if exists workspace_access_guest_write on public.workspace_access;
create policy workspace_access_guest_write on public.workspace_access
  for all to authenticated
  using (
    user_id is not null
    and public.is_org_guest(organization_id, user_id)
    and organization_id in (select public.current_user_org_ids())
    and workspace_id in (select public.writable_workspace_ids())
  )
  with check (
    user_id is not null
    and public.is_org_guest(organization_id, user_id)
    and organization_id in (select public.current_user_org_ids())
    and workspace_id in (select public.writable_workspace_ids())
  );

-- Invitations : admins pour l'équipe, tout membre pour des invités sur SES espaces.
drop policy if exists invites_insert_guest on public.organization_invites;
create policy invites_insert_guest on public.organization_invites
  for insert to authenticated
  with check (
    role = 'guest'
    and invited_by = auth.uid()
    and organization_id in (select public.current_user_org_ids())
    and cardinality(workspace_ids) > 0
    and workspace_ids <@ array(select public.writable_workspace_ids())
  );

drop policy if exists invites_select_guest on public.organization_invites;
create policy invites_select_guest on public.organization_invites
  for select to authenticated
  using (
    role = 'guest'
    and organization_id in (select public.current_user_org_ids())
    and workspace_ids && array(select public.accessible_workspace_ids())
  );

drop policy if exists invites_manage_guest on public.organization_invites;
create policy invites_manage_guest on public.organization_invites
  for all to authenticated
  using (
    role = 'guest'
    and organization_id in (select public.current_user_org_ids())
    and workspace_ids <@ array(select public.writable_workspace_ids())
  )
  with check (
    role = 'guest'
    and invited_by = auth.uid()
    and organization_id in (select public.current_user_org_ids())
    and cardinality(workspace_ids) > 0
    and workspace_ids <@ array(select public.writable_workspace_ids())
  );

-- Acceptation d'invitation : membres pleins, et accès par espace pour un invité.
create or replace function public.accept_org_invite(p_token text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  inv public.organization_invites;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select * into inv
  from public.organization_invites
  where token = p_token
  for update;

  if inv.id is null then
    raise exception 'Invitation introuvable';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Invitation déjà utilisée';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invitation expirée';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (inv.organization_id, auth.uid(), inv.role)
  on conflict (organization_id, user_id) do nothing;

  if inv.role = 'guest' then
    insert into public.workspace_access (organization_id, workspace_id, user_id, access_level)
    select inv.organization_id, w.id, auth.uid(), inv.access_level
    from public.workspaces w
    where w.id = any(inv.workspace_ids)
      and w.organization_id = inv.organization_id
    on conflict (workspace_id, user_id) where user_id is not null
    do update set access_level = excluded.access_level;
  end if;

  update public.organization_invites
    set accepted_at = now()
    where id = inv.id;

  return inv.organization_id;
end;
$$;

-- Aperçu public d'une invitation (page /invite/[token] avant connexion).
create or replace function public.get_invite_preview(p_token text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'organization', o.name,
    'logo_url', o.logo_url,
    'primary_color', o.primary_color,
    'role', i.role,
    'access_level', i.access_level,
    'spaces', coalesce((
      select jsonb_agg(w.name order by w.name)
      from public.workspaces w
      where w.id = any(i.workspace_ids) and w.organization_id = i.organization_id
    ), '[]'::jsonb)
  )
  from public.organization_invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > now();
$$;

revoke all on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

create or replace function public.get_organization_guest_count(org_id uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::integer
  from public.organization_members m
  where m.organization_id = org_id
    and m.role = 'guest'
    and org_id in (select public.current_user_org_ids());
$$;

revoke all on function public.get_organization_guest_count(uuid) from public, anon;
grant execute on function public.get_organization_guest_count(uuid) to authenticated;

-- =============================================================================
-- 2. Fichiers — corbeille, versions, remplacement, quotas
-- =============================================================================

alter table public.documents
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id),
  add column if not exists trash_batch uuid,
  add column if not exists version integer not null default 1,
  add column if not exists file_updated_at timestamptz not null default now(),
  add column if not exists file_updated_by uuid references public.profiles (id);

alter table public.folders
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id),
  add column if not exists trash_batch uuid;

create index if not exists documents_trash_idx
  on public.documents (workspace_id, deleted_at) where deleted_at is not null;
create index if not exists folders_trash_idx
  on public.folders (workspace_id, deleted_at) where deleted_at is not null;
create index if not exists documents_live_folder_idx
  on public.documents (workspace_id, folder_id) where deleted_at is null;
create index if not exists documents_recent_idx
  on public.documents (organization_id, file_updated_at desc) where deleted_at is null;

-- Historique des versions d'un fichier (l'ancienne version y est archivée
-- quand le fichier est remplacé ; le Storage conserve les deux objets).
create table if not exists public.document_versions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  document_id      uuid not null references public.documents (id) on delete cascade,
  version          integer not null,
  file_path        text not null,
  file_size        bigint,
  file_type        text,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  unique (document_id, version)
);

create index if not exists document_versions_document_idx on public.document_versions (document_id);
create index if not exists document_versions_org_idx on public.document_versions (organization_id);

alter table public.document_versions enable row level security;

drop policy if exists document_versions_select on public.document_versions;
create policy document_versions_select on public.document_versions
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists document_versions_write on public.document_versions;
create policy document_versions_write on public.document_versions
  for all to authenticated
  using (workspace_id in (select public.writable_workspace_ids()))
  with check (workspace_id in (select public.writable_workspace_ids()));

-- Vue corbeille : éléments de premier niveau uniquement (un dossier mis à la
-- corbeille masque son contenu, restauré d'un bloc via trash_batch).
create or replace view public.drive_trash_items as
  select 'folder'::text as kind,
    f.id,
    f.organization_id,
    f.workspace_id,
    f.parent_id as folder_id,
    f.name,
    null::text as file_type,
    (
      with recursive tree as (
        select f.id
        union
        select c.id from public.folders c join tree t on c.parent_id = t.id
      )
      select coalesce(sum(d.file_size), 0)::bigint
      from public.documents d
      where d.folder_id in (select id from tree)
    ) as size,
    f.deleted_at,
    f.deleted_by
  from public.folders f
  where f.deleted_at is not null
    and not exists (
      select 1 from public.folders p
      where p.id = f.parent_id and p.trash_batch = f.trash_batch
    )
union all
  select 'file'::text as kind,
    d.id,
    d.organization_id,
    d.workspace_id,
    d.folder_id,
    d.title as name,
    d.file_type,
    coalesce(d.file_size, 0) as size,
    d.deleted_at,
    d.deleted_by
  from public.documents d
  where d.deleted_at is not null
    and not exists (
      select 1 from public.folders p
      where p.id = d.folder_id and p.trash_batch = d.trash_batch
    );

-- Mise à la corbeille en bloc (sous-arbre complet, marqué d'un même batch).
create or replace function public.drive_trash(p_folder_ids uuid[], p_document_ids uuid[])
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_batch   uuid := gen_random_uuid();
  v_now     timestamptz := now();
  v_folders uuid[];
  n_folders int;
  n_docs    int;
begin
  with recursive tree as (
    select f.id
    from public.folders f
    where f.id = any(coalesce(p_folder_ids, '{}')) and f.deleted_at is null
    union
    select c.id
    from public.folders c
    join tree t on c.parent_id = t.id
    where c.deleted_at is null
  )
  select coalesce(array_agg(id), '{}') into v_folders from tree;

  update public.folders
     set deleted_at = v_now, deleted_by = auth.uid(), trash_batch = v_batch
   where id = any(v_folders);
  get diagnostics n_folders = row_count;

  update public.documents
     set deleted_at = v_now, deleted_by = auth.uid(), trash_batch = v_batch
   where deleted_at is null
     and (id = any(coalesce(p_document_ids, '{}')) or folder_id = any(v_folders));
  get diagnostics n_docs = row_count;

  return jsonb_build_object('batch', v_batch, 'folders', n_folders, 'documents', n_docs);
end;
$$;

-- Restauration : un élément sorti d'un parent encore supprimé remonte à la racine.
create or replace function public.drive_restore(p_folder_ids uuid[], p_document_ids uuid[])
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_folders uuid[];
  v_docs    uuid[];
  n_folders int;
  n_docs    int;
begin
  with recursive tree as (
    select f.id, f.trash_batch
    from public.folders f
    where f.id = any(coalesce(p_folder_ids, '{}')) and f.deleted_at is not null
    union
    select c.id, c.trash_batch
    from public.folders c
    join tree t on c.parent_id = t.id and c.trash_batch = t.trash_batch
  )
  select coalesce(array_agg(id), '{}') into v_folders from tree;

  select coalesce(array_agg(d.id), '{}') into v_docs
  from public.documents d
  where d.deleted_at is not null
    and (
      d.id = any(coalesce(p_document_ids, '{}'))
      or exists (
        select 1 from public.folders f
        where f.id = d.folder_id
          and f.id = any(v_folders)
          and f.trash_batch = d.trash_batch
      )
    );

  update public.documents d
     set deleted_at = null, deleted_by = null, trash_batch = null,
         folder_id = case
           when d.folder_id is not null
            and not (d.folder_id = any(v_folders))
            and exists (
              select 1 from public.folders p
              where p.id = d.folder_id and p.deleted_at is not null
            )
           then null
           else d.folder_id
         end
   where d.id = any(v_docs);
  get diagnostics n_docs = row_count;

  perform set_config('docalio.restore_roots', array_to_string(coalesce(p_folder_ids, '{}'), ','), true);

  update public.folders f
     set deleted_at = null, deleted_by = null, trash_batch = null,
         parent_id = case
           when f.parent_id is not null
            and not (f.parent_id = any(v_folders))
            and exists (
              select 1 from public.folders p
              where p.id = f.parent_id and p.deleted_at is not null
            )
           then null
           else f.parent_id
         end
   where f.id = any(v_folders);
  get diagnostics n_folders = row_count;

  return jsonb_build_object('folders', n_folders, 'documents', n_docs);
end;
$$;

-- Plan de purge (suppression définitive) : ids + chemins Storage à retirer,
-- versions comprises. Le client supprime ensuite lignes puis objets.
create or replace function public.drive_purge_plan(p_folder_ids uuid[], p_document_ids uuid[])
returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_roots   uuid[];
  v_folders uuid[];
  v_loose   uuid[];
  v_docs    uuid[];
  v_paths   text[];
begin
  select coalesce(array_agg(f.id), '{}') into v_roots
  from public.folders f
  where f.id = any(coalesce(p_folder_ids, '{}')) and f.deleted_at is not null;

  with recursive tree as (
    select unnest(v_roots) as id
    union
    select c.id from public.folders c join tree t on c.parent_id = t.id
  )
  select coalesce(array_agg(id), '{}') into v_folders from tree;

  select coalesce(array_agg(d.id), '{}') into v_loose
  from public.documents d
  where d.id = any(coalesce(p_document_ids, '{}'))
    and d.deleted_at is not null
    and not (coalesce(d.folder_id = any(v_folders), false));

  select coalesce(array_agg(d.id), '{}') into v_docs
  from public.documents d
  where d.id = any(v_loose) or d.folder_id = any(v_folders);

  select coalesce(array_agg(p), '{}') into v_paths
  from (
    select file_path as p from public.documents where id = any(v_docs)
    union
    select file_path from public.document_versions where document_id = any(v_docs)
  ) s;

  return jsonb_build_object(
    'folder_ids', to_jsonb(v_roots),
    'document_ids', to_jsonb(v_loose),
    'paths', to_jsonb(v_paths)
  );
end;
$$;

-- Enregistre un upload réalisé côté client (nouveau fichier, ou remplacement
-- qui archive l'ancienne version). Le chemin doit être dans l'espace, hors
-- préfixes réservés (requests/, drop/).
create or replace function public.drive_register_upload(
  p_workspace_id uuid,
  p_folder_id uuid,
  p_path text,
  p_name text,
  p_type text default null,
  p_replace_document_id uuid default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_ws     public.workspaces;
  v_doc    public.documents;
  v_prefix text;
  v_size   bigint;
  v_name   text;
  v_id     uuid;
begin
  select * into v_ws from public.workspaces where id = p_workspace_id;
  if v_ws.id is null then
    raise exception 'Espace introuvable';
  end if;
  if not public.can_write_workspace(p_workspace_id) then
    raise exception 'Accès en lecture seule';
  end if;

  v_prefix := 'organizations/' || v_ws.organization_id || '/workspaces/' || v_ws.id || '/';
  if p_path is null
     or left(p_path, length(v_prefix)) <> v_prefix
     or position('..' in p_path) > 0
     or split_part(substr(p_path, length(v_prefix) + 1), '/', 1) in ('requests', 'drop') then
    raise exception 'Chemin invalide';
  end if;

  select (o.metadata ->> 'size')::bigint into v_size
  from storage.objects o
  where o.bucket_id = 'documents' and o.name = p_path;
  if v_size is null then
    raise exception 'Fichier introuvable';
  end if;

  if exists (select 1 from public.documents where file_path = p_path)
     or exists (select 1 from public.document_versions where file_path = p_path) then
    raise exception 'Chemin déjà utilisé';
  end if;

  if p_folder_id is not null and not exists (
    select 1 from public.folders
    where id = p_folder_id and workspace_id = p_workspace_id and deleted_at is null
  ) then
    raise exception 'Dossier introuvable';
  end if;

  v_name := left(btrim(regexp_replace(coalesce(p_name, ''), '[/\\\r\n\t]', '-', 'g')), 255);
  if v_name = '' then
    v_name := 'Fichier';
  end if;

  if p_replace_document_id is not null then
    select * into v_doc
    from public.documents
    where id = p_replace_document_id
      and workspace_id = p_workspace_id
      and deleted_at is null
    for update;
    if v_doc.id is null then
      raise exception 'Fichier à remplacer introuvable';
    end if;

    insert into public.document_versions (
      organization_id, workspace_id, document_id, version,
      file_path, file_size, file_type, created_by, created_at
    ) values (
      v_doc.organization_id, v_doc.workspace_id, v_doc.id, v_doc.version,
      v_doc.file_path, v_doc.file_size, v_doc.file_type,
      v_doc.file_updated_by, v_doc.file_updated_at
    );

    update public.documents
       set file_path = p_path,
           file_size = v_size,
           file_type = nullif(left(coalesce(p_type, ''), 120), ''),
           version = v_doc.version + 1,
           file_updated_at = now(),
           file_updated_by = auth.uid()
     where id = v_doc.id;

    return jsonb_build_object('id', v_doc.id, 'version', v_doc.version + 1, 'replaced', true);
  end if;

  insert into public.documents (
    organization_id, workspace_id, folder_id, title, file_path, file_type,
    file_size, created_by, file_updated_by, is_visible_to_client
  ) values (
    v_ws.organization_id, v_ws.id, p_folder_id, v_name, p_path,
    nullif(left(coalesce(p_type, ''), 120), ''), v_size, auth.uid(), auth.uid(),
    v_ws.space_type = 'external'
  )
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'version', 1, 'replaced', false);
end;
$$;

-- Rétablit une ancienne version (échange avec la version courante).
create or replace function public.drive_restore_version(p_version_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_ver public.document_versions;
  v_doc public.documents;
begin
  select * into v_ver from public.document_versions where id = p_version_id;
  if v_ver.id is null then
    raise exception 'Version introuvable';
  end if;
  if not public.can_write_workspace(v_ver.workspace_id) then
    raise exception 'Accès en lecture seule';
  end if;

  select * into v_doc from public.documents where id = v_ver.document_id for update;
  if v_doc.id is null or v_doc.deleted_at is not null then
    raise exception 'Fichier introuvable';
  end if;

  update public.document_versions
     set version = v_doc.version,
         file_path = v_doc.file_path,
         file_size = v_doc.file_size,
         file_type = v_doc.file_type,
         created_by = v_doc.file_updated_by,
         created_at = v_doc.file_updated_at
   where id = v_ver.id;

  perform set_config('docalio.version_restore', 'on', true);

  update public.documents
     set file_path = v_ver.file_path,
         file_size = v_ver.file_size,
         file_type = v_ver.file_type,
         version = v_doc.version + 1,
         file_updated_at = now(),
         file_updated_by = auth.uid()
   where id = v_doc.id;

  return jsonb_build_object('id', v_doc.id, 'version', v_doc.version + 1, 'restored_from', v_ver.version);
end;
$$;

-- Crée (ou retrouve) une chaîne de dossiers — import de dossiers du poste.
create or replace function public.drive_ensure_folder_path(
  p_workspace_id uuid,
  p_parent_id uuid,
  p_names text[]
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_ws     public.workspaces;
  v_parent uuid := p_parent_id;
  v_id     uuid;
  v_name   text;
begin
  select * into v_ws from public.workspaces where id = p_workspace_id;
  if v_ws.id is null then
    raise exception 'Espace introuvable';
  end if;

  foreach v_name in array coalesce(p_names, '{}') loop
    v_name := left(btrim(regexp_replace(v_name, '[/\\\r\n\t]', '-', 'g')), 120);
    continue when v_name = '';

    select f.id into v_id
    from public.folders f
    where f.workspace_id = p_workspace_id
      and f.deleted_at is null
      and f.parent_id is not distinct from v_parent
      and f.name = v_name
    order by f.created_at
    limit 1;

    if v_id is null then
      insert into public.folders (organization_id, workspace_id, parent_id, name, created_by)
      values (v_ws.organization_id, v_ws.id, v_parent, v_name, auth.uid())
      returning id into v_id;
    end if;

    v_parent := v_id;
    v_id := null;
  end loop;

  return v_parent;
end;
$$;

-- Statistiques de dossiers (contenu direct + poids du sous-arbre).
create or replace function public.drive_folder_stats(p_folder_ids uuid[])
returns table (folder_id uuid, files integer, folders integer, bytes bigint)
language sql stable
set search_path = public
as $$
  select
    f.id,
    (select count(*) from public.documents d
      where d.folder_id = f.id and d.deleted_at is null)::integer,
    (select count(*) from public.folders c
      where c.parent_id = f.id and c.deleted_at is null)::integer,
    (
      with recursive tree as (
        select f.id
        union
        select c.id from public.folders c join tree t on c.parent_id = t.id
        where c.deleted_at is null
      )
      select coalesce(sum(d.file_size), 0)::bigint
      from public.documents d
      where d.folder_id in (select id from tree) and d.deleted_at is null
    )
  from public.folders f
  where f.id = any(coalesce(p_folder_ids, '{}'));
$$;

-- Statistiques par espace (liste des espaces du dashboard).
create or replace function public.drive_workspace_stats(p_org uuid)
returns table (workspace_id uuid, files integer, bytes bigint, last_file_at timestamptz)
language sql stable
set search_path = public
as $$
  select
    d.workspace_id,
    count(*)::integer,
    coalesce(sum(d.file_size), 0)::bigint,
    max(d.file_updated_at)
  from public.documents d
  where d.organization_id = p_org
    and d.deleted_at is null
  group by d.workspace_id;
$$;

-- Tous les chemins Storage d'un espace (suppression d'espace).
create or replace function public.drive_workspace_file_paths(p_workspace_id uuid)
returns text[]
language sql stable
set search_path = public
as $$
  select coalesce(array_agg(p), '{}')
  from (
    select file_path as p from public.documents where workspace_id = p_workspace_id
    union
    select file_path from public.document_versions where workspace_id = p_workspace_id
    union
    select file_path from public.document_requests
    where workspace_id = p_workspace_id and file_path is not null
  ) s;
$$;

revoke all on function public.drive_trash(uuid[], uuid[]) from public, anon;
grant execute on function public.drive_trash(uuid[], uuid[]) to authenticated;
revoke all on function public.drive_restore(uuid[], uuid[]) from public, anon;
grant execute on function public.drive_restore(uuid[], uuid[]) to authenticated;
revoke all on function public.drive_purge_plan(uuid[], uuid[]) from public, anon;
grant execute on function public.drive_purge_plan(uuid[], uuid[]) to authenticated;
revoke all on function public.drive_register_upload(uuid, uuid, text, text, text, uuid) from public, anon;
grant execute on function public.drive_register_upload(uuid, uuid, text, text, text, uuid) to authenticated;
revoke all on function public.drive_restore_version(uuid) from public, anon;
grant execute on function public.drive_restore_version(uuid) to authenticated;
revoke all on function public.drive_ensure_folder_path(uuid, uuid, text[]) from public, anon;
grant execute on function public.drive_ensure_folder_path(uuid, uuid, text[]) to authenticated;
revoke all on function public.drive_folder_stats(uuid[]) from public, anon;
grant execute on function public.drive_folder_stats(uuid[]) to authenticated;
revoke all on function public.drive_workspace_stats(uuid) from public, anon;
grant execute on function public.drive_workspace_stats(uuid) to authenticated;
revoke all on function public.drive_workspace_file_paths(uuid) from public, anon;
grant execute on function public.drive_workspace_file_paths(uuid) to authenticated;

-- Quota de stockage par plan, appliqué au niveau base (défense en profondeur).
-- Les versions archivées comptent dans le quota.
create or replace function public.plan_storage_quota(p_plan text)
returns bigint
language sql immutable
set search_path = public
as $$
  select case p_plan
    when 'starter'  then 2::bigint * 1024 * 1024 * 1024
    when 'pro'      then 200::bigint * 1024 * 1024 * 1024
    when 'business' then 1024::bigint * 1024 * 1024 * 1024
    else null
  end;
$$;

create or replace function public.organization_storage_used(p_org uuid)
returns bigint
language sql stable security definer
set search_path = public
as $$
  select
    coalesce((select sum(file_size) from public.documents where organization_id = p_org), 0)::bigint
    + coalesce((select sum(file_size) from public.document_versions where organization_id = p_org), 0)::bigint;
$$;

revoke all on function public.organization_storage_used(uuid) from public, anon, authenticated;

create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_quota bigint;
  v_delta bigint;
begin
  v_delta := coalesce(new.file_size, 0)
           - case when tg_op = 'UPDATE' then coalesce(old.file_size, 0) else 0 end;
  if v_delta <= 0 then
    return new;
  end if;

  select public.plan_storage_quota(o.plan) into v_quota
  from public.organizations o where o.id = new.organization_id;
  if v_quota is null then
    return new;
  end if;

  if public.organization_storage_used(new.organization_id) + v_delta > v_quota then
    raise exception 'Quota de stockage atteint'
      using errcode = 'P0001', hint = 'quota_exceeded';
  end if;
  return new;
end;
$$;

drop trigger if exists documents_storage_quota on public.documents;
create trigger documents_storage_quota
  before insert or update of file_size on public.documents
  for each row execute function public.enforce_storage_quota();

-- L'usage inclut les versions ; les invités ne comptent pas comme membres.
create or replace function public.get_organization_usage(org_id uuid)
returns table (storage_used bigint, active_workspaces integer, members_count integer)
language sql stable security definer
set search_path = public
as $$
  select
    public.organization_storage_used(org_id) as storage_used,
    (select count(*) from public.workspaces w
     where w.organization_id = org_id and w.status = 'active')::integer
      as active_workspaces,
    (select count(*) from public.organization_members m
     where m.organization_id = org_id and m.role <> 'guest')::integer as members_count
  where org_id in (select public.current_user_org_ids());
$$;

-- Storage : lecture selon les espaces accessibles, écriture selon les espaces
-- modifiables (les invités « lecture seule » ne peuvent plus écrire).
drop policy if exists documents_storage_select on storage.objects;
create policy documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[4] in (
      select w::text from public.accessible_workspace_ids() w
    )
  );

drop policy if exists documents_storage_insert on storage.objects;
create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[4] in (
      select w::text from public.writable_workspace_ids() w
    )
  );

drop policy if exists documents_storage_delete on storage.objects;
create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[4] in (
      select w::text from public.writable_workspace_ids() w
    )
  );

-- =============================================================================
-- 3. Audit d'activité interne (journal du Drive)
-- =============================================================================

alter table public.activity_events
  add column if not exists actor_id uuid references public.profiles (id),
  add column if not exists folder_id uuid,
  add column if not exists drive_link_id uuid;

-- L'app peut consigner explicitement un téléchargement interne.
drop policy if exists activity_events_insert_actor on public.activity_events;
create policy activity_events_insert_actor on public.activity_events
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and workspace_id in (select public.accessible_workspace_ids())
    and event_type = 'file_downloaded'
  );

drop policy if exists activity_events_select_member on public.activity_events;
create policy activity_events_select_member on public.activity_events
  for select to authenticated
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

create or replace function public.log_document_activity()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_type text;
  v_meta jsonb;
  v_row  public.documents;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    v_row := new;
    v_type := 'file_uploaded';
    v_meta := jsonb_build_object('title', new.title, 'file_size', new.file_size);

  elsif tg_op = 'UPDATE' then
    v_row := new;
    if old.deleted_at is null and new.deleted_at is not null then
      if exists (select 1 from public.folders
                 where id = new.folder_id and trash_batch = new.trash_batch) then
        return new;
      end if;
      v_type := 'file_trashed';
    elsif old.deleted_at is not null and new.deleted_at is null then
      if exists (select 1 from public.folders
                 where id = old.folder_id and trash_batch = old.trash_batch) then
        return new;
      end if;
      v_type := 'file_restored';
    elsif new.file_path is distinct from old.file_path then
      v_type := case
        when current_setting('docalio.version_restore', true) = 'on'
        then 'file_version_restored' else 'file_version_uploaded' end;
      v_meta := jsonb_build_object('title', new.title, 'version', new.version,
                                   'file_size', new.file_size);
    elsif new.title is distinct from old.title then
      v_type := 'file_renamed';
      v_meta := jsonb_build_object('title', new.title, 'previous_title', old.title);
    elsif new.folder_id is distinct from old.folder_id then
      v_type := 'file_moved';
      v_meta := jsonb_build_object(
        'title', new.title,
        'from_folder', (select name from public.folders where id = old.folder_id),
        'to_folder', (select name from public.folders where id = new.folder_id)
      );
    else
      return new;
    end if;

  else
    v_row := old;
    if not exists (select 1 from public.workspaces where id = old.workspace_id) then
      return old;
    end if;
    if old.folder_id is not null
       and not exists (select 1 from public.folders where id = old.folder_id) then
      return old;
    end if;
    v_type := 'file_deleted';
    v_meta := jsonb_build_object('title', old.title, 'file_size', old.file_size);
  end if;

  insert into public.activity_events (
    organization_id, workspace_id, document_id, folder_id, actor_id, event_type, metadata
  ) values (
    v_row.organization_id,
    v_row.workspace_id,
    case when tg_op = 'INSERT' or tg_op = 'UPDATE' then v_row.id else null end,
    v_row.folder_id,
    auth.uid(),
    v_type,
    coalesce(v_meta, jsonb_build_object('title', v_row.title))
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.log_folder_activity()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_type text;
  v_meta jsonb;
  v_row  public.folders;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    v_row := new;
    v_type := 'folder_created';

  elsif tg_op = 'UPDATE' then
    v_row := new;
    if old.deleted_at is null and new.deleted_at is not null then
      if exists (select 1 from public.folders
                 where id = new.parent_id and trash_batch = new.trash_batch) then
        return new;
      end if;
      v_type := 'folder_trashed';
    elsif old.deleted_at is not null and new.deleted_at is null then
      if coalesce(current_setting('docalio.restore_roots', true), '') <> ''
         and position(new.id::text in current_setting('docalio.restore_roots', true)) = 0 then
        return new;
      end if;
      v_type := 'folder_restored';
    elsif new.name is distinct from old.name then
      v_type := 'folder_renamed';
      v_meta := jsonb_build_object('title', new.name, 'previous_title', old.name);
    elsif new.parent_id is distinct from old.parent_id then
      v_type := 'folder_moved';
      v_meta := jsonb_build_object(
        'title', new.name,
        'from_folder', (select name from public.folders where id = old.parent_id),
        'to_folder', (select name from public.folders where id = new.parent_id)
      );
    else
      return new;
    end if;

  else
    v_row := old;
    if not exists (select 1 from public.workspaces where id = old.workspace_id) then
      return old;
    end if;
    if old.parent_id is not null
       and not exists (select 1 from public.folders where id = old.parent_id) then
      return old;
    end if;
    v_type := 'folder_deleted';
  end if;

  insert into public.activity_events (
    organization_id, workspace_id, folder_id, actor_id, event_type, metadata
  ) values (
    v_row.organization_id,
    v_row.workspace_id,
    case when tg_op = 'INSERT' or tg_op = 'UPDATE' then v_row.id else null end,
    auth.uid(),
    v_type,
    coalesce(v_meta, jsonb_build_object('title', v_row.name))
  );

  return coalesce(new, old);
end;
$$;

create or replace function public.log_access_activity()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_row public.workspace_access;
  v_who text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  v_row := coalesce(new, old);
  if tg_op <> 'INSERT'
     and not exists (select 1 from public.workspaces where id = v_row.workspace_id) then
    return old;
  end if;

  if v_row.user_id is not null then
    select coalesce(p.full_name, p.email) into v_who from public.profiles p where p.id = v_row.user_id;
  else
    select g.name into v_who from public.organization_groups g where g.id = v_row.group_id;
  end if;

  insert into public.activity_events (
    organization_id, workspace_id, actor_id, event_type, metadata
  ) values (
    v_row.organization_id,
    v_row.workspace_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'access_granted' else 'access_revoked' end,
    jsonb_build_object('title', v_who, 'access_level', v_row.access_level,
                       'guest', v_row.user_id is not null
                                and public.is_org_guest(v_row.organization_id, v_row.user_id),
                       'self', coalesce(v_row.user_id = auth.uid(), false))
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists documents_activity_log on public.documents;
create trigger documents_activity_log
  after insert or update on public.documents
  for each row execute function public.log_document_activity();

drop trigger if exists documents_activity_log_removal on public.documents;
create trigger documents_activity_log_removal
  after delete on public.documents
  for each row execute function public.log_document_activity();

drop trigger if exists folders_activity_log on public.folders;
create trigger folders_activity_log
  after insert or update on public.folders
  for each row execute function public.log_folder_activity();

drop trigger if exists folders_activity_log_removal on public.folders;
create trigger folders_activity_log_removal
  after delete on public.folders
  for each row execute function public.log_folder_activity();

drop trigger if exists workspace_access_activity_log on public.workspace_access;
create trigger workspace_access_activity_log
  after insert on public.workspace_access
  for each row execute function public.log_access_activity();

drop trigger if exists workspace_access_activity_log_removal on public.workspace_access;
create trigger workspace_access_activity_log_removal
  after delete on public.workspace_access
  for each row execute function public.log_access_activity();

-- =============================================================================
-- 4. MFA — si un utilisateur a activé la 2FA, une session aal2 est exigée
--    pour toucher aux données ; si l'organisation l'exige, idem (require_mfa).
-- =============================================================================

alter table public.organizations
  add column if not exists require_mfa boolean not null default false;

create or replace function public.mfa_satisfied()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

revoke all on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'documents', 'folders', 'workspaces', 'activity_events',
    'document_versions', 'drive_links', 'workspace_access', 'organization_invites'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_mfa', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
       using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))',
      t || '_mfa', t
    );
  end loop;
end
$$;

drop policy if exists documents_storage_mfa on storage.objects;
create policy documents_storage_mfa on storage.objects
  as restrictive for all to authenticated
  using (bucket_id <> 'documents' or (select public.mfa_satisfied()))
  with check (bucket_id <> 'documents' or (select public.mfa_satisfied()));

-- =============================================================================
-- 5. Liens de partage par fichier / dossier / espace (drive_links)
--    Permissions à la carte, mot de passe (bcrypt), expiration, dépôt public.
-- =============================================================================

create table if not exists public.drive_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  folder_id        uuid references public.folders (id) on delete cascade,
  document_id      uuid references public.documents (id) on delete cascade,
  token            text not null unique,
  can_view         boolean not null default true,
  can_download     boolean not null default true,
  can_upload       boolean not null default false,
  has_password     boolean not null default false,
  label            text,
  expires_at       timestamptz,
  is_active        boolean not null default true,
  revoked_at       timestamptz,
  view_count       integer not null default 0,
  download_count   integer not null default 0,
  upload_count     integer not null default 0,
  last_accessed_at timestamptz,
  failed_attempts  integer not null default 0,
  locked_until     timestamptz,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade,
  check (num_nonnulls(folder_id, document_id) <= 1),
  check (document_id is null or not can_upload),
  check (can_view or can_upload),
  check (can_view or not can_download),
  check (label is null or char_length(label) <= 120)
);

create index if not exists drive_links_workspace_idx on public.drive_links (workspace_id);
create index if not exists drive_links_org_idx on public.drive_links (organization_id, created_at desc);
create index if not exists drive_links_folder_idx on public.drive_links (folder_id);
create index if not exists drive_links_document_idx on public.drive_links (document_id);

-- Secret séparé : jamais exposé via la RLS de drive_links.
create table if not exists public.drive_link_secrets (
  link_id       uuid primary key references public.drive_links (id) on delete cascade,
  password_hash text,
  updated_at    timestamptz not null default now()
);

-- Sessions de déverrouillage (lien protégé par mot de passe).
create table if not exists public.drive_link_sessions (
  id         uuid primary key default gen_random_uuid(),
  link_id    uuid not null references public.drive_links (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '12 hours',
  created_at timestamptz not null default now()
);

create index if not exists drive_link_sessions_link_idx on public.drive_link_sessions (link_id);

alter table public.drive_links enable row level security;
alter table public.drive_link_secrets enable row level security;
alter table public.drive_link_sessions enable row level security;
-- secrets & sessions : aucune policy — accès uniquement via les RPC definer.

drop policy if exists drive_links_select_member on public.drive_links;
create policy drive_links_select_member on public.drive_links
  for select to authenticated
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

drop policy if exists drive_links_insert_member on public.drive_links;
create policy drive_links_insert_member on public.drive_links
  for insert to authenticated
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

drop policy if exists drive_links_update_member on public.drive_links;
create policy drive_links_update_member on public.drive_links
  for update to authenticated
  using (
    workspace_id in (select public.writable_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  )
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

drop trigger if exists set_drive_links_updated_at on public.drive_links;
create trigger set_drive_links_updated_at
  before update on public.drive_links
  for each row execute function public.set_updated_at();

create or replace function public.drive_new_token()
returns text
language sql
set search_path = public
as $$
  select translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
$$;

revoke all on function public.drive_new_token() from public, anon, authenticated;

-- --- Gestion (membres) -------------------------------------------------------

create or replace function public.create_drive_link(
  p_workspace_id uuid,
  p_folder_id uuid,
  p_document_id uuid,
  p_can_view boolean,
  p_can_download boolean,
  p_can_upload boolean,
  p_expires_at timestamptz,
  p_password text,
  p_label text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_ws   public.workspaces;
  v_link public.drive_links;
  v_view boolean := coalesce(p_can_view, true);
  v_up   boolean := p_document_id is null and coalesce(p_can_upload, false);
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Authentification requise';
  end if;

  select * into v_ws from public.workspaces where id = p_workspace_id;
  if v_ws.id is null
     or v_ws.organization_id not in (select public.current_user_org_ids())
     or not public.can_write_workspace(v_ws.id) then
    raise exception 'Espace introuvable';
  end if;

  if p_folder_id is not null and p_document_id is not null then
    raise exception 'Cible invalide';
  end if;
  if p_folder_id is not null and not exists (
    select 1 from public.folders
    where id = p_folder_id and workspace_id = v_ws.id and deleted_at is null
  ) then
    raise exception 'Dossier introuvable';
  end if;
  if p_document_id is not null and not exists (
    select 1 from public.documents
    where id = p_document_id and workspace_id = v_ws.id and deleted_at is null
  ) then
    raise exception 'Fichier introuvable';
  end if;
  if not v_view and not v_up then
    raise exception 'Choisissez au moins une permission';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Date d''expiration passée';
  end if;
  if coalesce(char_length(p_password), 0) between 1 and 3 then
    raise exception 'Mot de passe trop court';
  end if;

  insert into public.drive_links (
    organization_id, workspace_id, folder_id, document_id, token,
    can_view, can_download, can_upload, expires_at, label, has_password, created_by
  ) values (
    v_ws.organization_id, v_ws.id, p_folder_id, p_document_id, public.drive_new_token(),
    v_view,
    v_view and coalesce(p_can_download, true),
    v_up,
    p_expires_at,
    nullif(left(btrim(coalesce(p_label, '')), 120), ''),
    coalesce(char_length(p_password), 0) > 0,
    auth.uid()
  )
  returning * into v_link;

  if coalesce(char_length(p_password), 0) > 0 then
    insert into public.drive_link_secrets (link_id, password_hash)
    values (v_link.id, extensions.crypt(p_password, extensions.gen_salt('bf', 10)));
  end if;

  return jsonb_build_object('id', v_link.id, 'token', v_link.token);
end;
$$;

create or replace function public.update_drive_link(
  p_link_id uuid,
  p_can_view boolean,
  p_can_download boolean,
  p_can_upload boolean,
  p_expires_at timestamptz,
  p_clear_expiry boolean,
  p_password text,
  p_label text
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_link public.drive_links;
  v_view boolean;
  v_up   boolean;
begin
  if auth.uid() is null or not public.mfa_satisfied() then
    raise exception 'Authentification requise';
  end if;

  select * into v_link from public.drive_links where id = p_link_id for update;
  if v_link.id is null
     or v_link.organization_id not in (select public.current_user_org_ids())
     or not public.can_write_workspace(v_link.workspace_id) then
    raise exception 'Lien introuvable';
  end if;
  if p_password is not null and char_length(p_password) between 1 and 3 then
    raise exception 'Mot de passe trop court';
  end if;

  v_view := coalesce(p_can_view, v_link.can_view);
  v_up := v_link.document_id is null and coalesce(p_can_upload, v_link.can_upload);
  if not v_view and not v_up then
    raise exception 'Choisissez au moins une permission';
  end if;

  update public.drive_links
     set can_view = v_view,
         can_download = v_view and coalesce(p_can_download, can_download),
         can_upload = v_up,
         expires_at = case when p_clear_expiry then null else coalesce(p_expires_at, expires_at) end,
         label = case when p_label is null then label
                      else nullif(left(btrim(p_label), 120), '') end,
         has_password = case when p_password is null then has_password
                             else char_length(p_password) > 0 end,
         failed_attempts = 0,
         locked_until = null
   where id = v_link.id;

  if p_password is not null then
    update public.drive_link_sessions set expires_at = now() where link_id = v_link.id;
    insert into public.drive_link_secrets (link_id, password_hash)
    values (
      v_link.id,
      case when char_length(p_password) = 0 then null
           else extensions.crypt(p_password, extensions.gen_salt('bf', 10)) end
    )
    on conflict (link_id) do update
      set password_hash = excluded.password_hash, updated_at = now();
  end if;
end;
$$;

revoke all on function public.create_drive_link(uuid, uuid, uuid, boolean, boolean, boolean, timestamptz, text, text) from public, anon;
grant execute on function public.create_drive_link(uuid, uuid, uuid, boolean, boolean, boolean, timestamptz, text, text) to authenticated;
revoke all on function public.update_drive_link(uuid, boolean, boolean, boolean, timestamptz, boolean, text, text) from public, anon;
grant execute on function public.update_drive_link(uuid, boolean, boolean, boolean, timestamptz, boolean, text, text) to authenticated;

-- --- Résolution (helpers internes, non exposés) ------------------------------

create or replace function public.drive_link_active(p_token text)
returns public.drive_links
language sql stable security definer
set search_path = public
as $$
  select *
  from public.drive_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

create or replace function public.drive_link_session_valid(p_link_id uuid, p_session text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select not exists (
           select 1 from public.drive_link_secrets
           where link_id = p_link_id and password_hash is not null
         )
      or exists (
           select 1 from public.drive_link_sessions s
           where s.link_id = p_link_id
             and s.token_hash = encode(extensions.digest(coalesce(p_session, ''), 'sha256'), 'hex')
             and s.expires_at > now()
         );
$$;

create or replace function public.drive_link_folder_in_scope(p_link public.drive_links, p_folder uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case
    when p_link.document_id is not null then false
    when p_folder is null then p_link.folder_id is null
    else exists (
      with recursive up as (
        select f.id, f.parent_id
        from public.folders f
        where f.id = p_folder and f.workspace_id = p_link.workspace_id and f.deleted_at is null
        union
        select p.id, p.parent_id
        from public.folders p join up on p.id = up.parent_id
        where p.deleted_at is null
      )
      select 1 from up
      where p_link.folder_id is null or up.id = p_link.folder_id
    )
  end;
$$;

create or replace function public.drive_link_document_in_scope(p_link public.drive_links, p_document uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.documents d
    where d.id = p_document
      and d.workspace_id = p_link.workspace_id
      and d.deleted_at is null
      and (
        d.id = p_link.document_id
        or (
          p_link.document_id is null
          and (
            p_link.folder_id is null
            or (d.folder_id is not null and public.drive_link_folder_in_scope(p_link, d.folder_id))
          )
        )
      )
  );
$$;

revoke all on function public.drive_link_active(text) from public, anon, authenticated;
revoke all on function public.drive_link_session_valid(uuid, text) from public, anon, authenticated;
revoke all on function public.drive_link_folder_in_scope(public.drive_links, uuid) from public, anon, authenticated;
revoke all on function public.drive_link_document_in_scope(public.drive_links, uuid) from public, anon, authenticated;

-- --- RPC publiques du lien (page /l/[token]) ---------------------------------

create or replace function public.link_get(p_token text, p_session text, p_folder_id uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_link    public.drive_links;
  v_org     public.organizations;
  v_brand   jsonb;
  v_root    jsonb;
  v_folder  uuid;
  v_crumbs  jsonb;
  v_folders jsonb := '[]'::jsonb;
  v_files   jsonb := '[]'::jsonb;
begin
  v_link := public.drive_link_active(p_token);
  if v_link.id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_org from public.organizations where id = v_link.organization_id;
  v_brand := jsonb_build_object(
    'name', v_org.name,
    'logo_url', v_org.logo_url,
    'primary_color', v_org.primary_color,
    'plan', v_org.plan
  );

  if not public.drive_link_session_valid(v_link.id, p_session) then
    return jsonb_build_object(
      'status', case when v_link.locked_until > now() then 'locked' else 'password' end,
      'organization', v_brand
    );
  end if;

  if v_link.document_id is not null then
    select jsonb_build_object('kind', 'file', 'name', d.title)
      into v_root
    from public.documents d where d.id = v_link.document_id and d.deleted_at is null;
  elsif v_link.folder_id is not null then
    select jsonb_build_object('kind', 'folder', 'name', f.name, 'id', f.id)
      into v_root
    from public.folders f where f.id = v_link.folder_id and f.deleted_at is null;
  else
    select jsonb_build_object('kind', 'space', 'name', w.name)
      into v_root
    from public.workspaces w where w.id = v_link.workspace_id;
  end if;

  if v_root is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  v_folder := v_link.folder_id;
  if p_folder_id is not null and v_link.document_id is null
     and public.drive_link_folder_in_scope(v_link, p_folder_id) then
    v_folder := p_folder_id;
  end if;

  with recursive up as (
    select f.id, f.parent_id, f.name, 0 as depth
    from public.folders f
    where f.id = v_folder and v_folder is not null
    union all
    select p.id, p.parent_id, p.name, up.depth + 1
    from public.folders p join up on p.id = up.parent_id
    where up.id is distinct from v_link.folder_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name) order by depth desc), '[]'::jsonb)
    into v_crumbs
  from up;

  if v_link.can_view then
    if v_link.document_id is not null then
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', d.id, 'name', d.title, 'file_type', d.file_type,
               'file_size', d.file_size, 'updated_at', d.file_updated_at)), '[]'::jsonb)
        into v_files
      from public.documents d
      where d.id = v_link.document_id and d.deleted_at is null;
    else
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', f.id, 'name', f.name, 'updated_at', f.updated_at,
               'items', (select count(*) from public.documents d
                         where d.folder_id = f.id and d.deleted_at is null)
                      + (select count(*) from public.folders c
                         where c.parent_id = f.id and c.deleted_at is null)
             ) order by lower(f.name)), '[]'::jsonb)
        into v_folders
      from public.folders f
      where f.workspace_id = v_link.workspace_id
        and f.deleted_at is null
        and f.parent_id is not distinct from v_folder;

      select coalesce(jsonb_agg(jsonb_build_object(
               'id', d.id, 'name', d.title, 'file_type', d.file_type,
               'file_size', d.file_size, 'updated_at', d.file_updated_at
             ) order by lower(d.title)), '[]'::jsonb)
        into v_files
      from public.documents d
      where d.workspace_id = v_link.workspace_id
        and d.deleted_at is null
        and d.folder_id is not distinct from v_folder;
    end if;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'organization', v_brand,
    'link', jsonb_build_object(
      'can_view', v_link.can_view,
      'can_download', v_link.can_download,
      'can_upload', v_link.can_upload,
      'expires_at', v_link.expires_at,
      'label', v_link.label
    ),
    'root', v_root,
    'folder_id', v_folder,
    'breadcrumb', v_crumbs,
    'folders', v_folders,
    'files', v_files
  );
end;
$$;

create or replace function public.link_unlock(p_token text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_link    public.drive_links;
  v_hash    text;
  v_session text;
begin
  v_link := public.drive_link_active(p_token);
  if v_link.id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select password_hash into v_hash
  from public.drive_link_secrets where link_id = v_link.id;
  if v_hash is null then
    return jsonb_build_object('status', 'ok', 'session', null);
  end if;

  if v_link.locked_until is not null and v_link.locked_until > now() then
    return jsonb_build_object('status', 'locked', 'until', v_link.locked_until);
  end if;

  if extensions.crypt(coalesce(p_password, ''), v_hash) <> v_hash then
    update public.drive_links
       set failed_attempts = case when failed_attempts + 1 >= 8 then 0 else failed_attempts + 1 end,
           locked_until = case when failed_attempts + 1 >= 8
                               then now() + interval '15 minutes' else locked_until end
     where id = v_link.id;
    return jsonb_build_object('status', 'wrong_password');
  end if;

  update public.drive_links set failed_attempts = 0, locked_until = null where id = v_link.id;

  v_session := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.drive_link_sessions (link_id, token_hash)
  values (v_link.id, encode(extensions.digest(v_session, 'sha256'), 'hex'));

  return jsonb_build_object('status', 'ok', 'session', v_session);
end;
$$;

create or replace function public.link_file_access(
  p_token text, p_session text, p_document_id uuid, p_download boolean, p_visitor_id text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_link public.drive_links;
  v_doc  public.documents;
begin
  v_link := public.drive_link_active(p_token);
  if v_link.id is null or not public.drive_link_session_valid(v_link.id, p_session) then
    return null;
  end if;
  if not v_link.can_view or (p_download and not v_link.can_download) then
    return null;
  end if;
  if not public.drive_link_document_in_scope(v_link, p_document_id) then
    return null;
  end if;

  select * into v_doc from public.documents where id = p_document_id;

  if p_download then
    update public.drive_links
       set download_count = download_count + 1, last_accessed_at = now()
     where id = v_link.id;

    insert into public.activity_events (
      organization_id, workspace_id, document_id, folder_id, drive_link_id,
      event_type, visitor_id, metadata
    ) values (
      v_doc.organization_id, v_doc.workspace_id, v_doc.id, v_doc.folder_id, v_link.id,
      'share_downloaded', nullif(left(coalesce(p_visitor_id, ''), 64), ''),
      jsonb_build_object('title', v_doc.title, 'file_size', v_doc.file_size)
    );
  end if;

  return jsonb_build_object(
    'path', v_doc.file_path,
    'name', v_doc.title,
    'file_type', v_doc.file_type,
    'file_size', v_doc.file_size
  );
end;
$$;

create or replace function public.link_record_open(p_token text, p_session text, p_visitor_id text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_link    public.drive_links;
  v_visitor text := nullif(left(coalesce(p_visitor_id, ''), 64), '');
begin
  v_link := public.drive_link_active(p_token);
  if v_link.id is null or not public.drive_link_session_valid(v_link.id, p_session) then
    return;
  end if;

  if exists (
    select 1 from public.activity_events e
    where e.drive_link_id = v_link.id
      and e.event_type = 'share_opened'
      and e.visitor_id is not distinct from v_visitor
      and e.created_at > now() - interval '1 hour'
  ) then
    return;
  end if;

  update public.drive_links
     set view_count = view_count + 1, last_accessed_at = now()
   where id = v_link.id;

  insert into public.activity_events (
    organization_id, workspace_id, document_id, folder_id, drive_link_id,
    event_type, visitor_id, metadata
  ) values (
    v_link.organization_id, v_link.workspace_id, v_link.document_id, v_link.folder_id,
    v_link.id, 'share_opened', v_visitor,
    jsonb_build_object('label', v_link.label)
  );
end;
$$;

create or replace function public.link_upload_prefix(p_token text, p_session text)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_link public.drive_links;
begin
  v_link := public.drive_link_active(p_token);
  if v_link.id is null or not v_link.can_upload
     or not public.drive_link_session_valid(v_link.id, p_session) then
    return null;
  end if;
  return 'organizations/' || v_link.organization_id
      || '/workspaces/' || v_link.workspace_id
      || '/drop/' || v_link.id || '/';
end;
$$;

create or replace function public.link_complete_upload(
  p_token text, p_session text, p_folder_id uuid, p_path text,
  p_name text, p_type text, p_visitor_id text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_link   public.drive_links;
  v_prefix text;
  v_size   bigint;
  v_name   text;
  v_folder uuid;
  v_id     uuid;
begin
  v_link := public.drive_link_active(p_token);
  if v_link.id is null or not v_link.can_upload
     or not public.drive_link_session_valid(v_link.id, p_session) then
    return jsonb_build_object('status', 'invalid');
  end if;

  v_prefix := 'organizations/' || v_link.organization_id
           || '/workspaces/' || v_link.workspace_id
           || '/drop/' || v_link.id || '/';
  if p_path is null
     or left(p_path, length(v_prefix)) <> v_prefix
     or position('..' in p_path) > 0
     or position('/' in substr(p_path, length(v_prefix) + 1)) > 0 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select (o.metadata ->> 'size')::bigint into v_size
  from storage.objects o
  where o.bucket_id = 'documents' and o.name = p_path;
  if v_size is null then
    return jsonb_build_object('status', 'missing');
  end if;
  if exists (select 1 from public.documents where file_path = p_path) then
    return jsonb_build_object('status', 'invalid');
  end if;

  v_folder := v_link.folder_id;
  if p_folder_id is not null and v_link.can_view
     and public.drive_link_folder_in_scope(v_link, p_folder_id) then
    v_folder := p_folder_id;
  end if;

  v_name := left(btrim(regexp_replace(coalesce(p_name, ''), '[/\\\r\n\t]', '-', 'g')), 255);
  if v_name = '' then
    v_name := 'Fichier';
  end if;

  begin
    insert into public.documents (
      organization_id, workspace_id, folder_id, title, file_path, file_type,
      file_size, created_by, is_visible_to_client
    ) values (
      v_link.organization_id, v_link.workspace_id, v_folder, v_name, p_path,
      nullif(left(coalesce(p_type, ''), 120), ''), v_size, null, false
    )
    returning id into v_id;
  exception when others then
    if sqlerrm like 'Quota%' then
      return jsonb_build_object('status', 'quota');
    end if;
    raise;
  end;

  update public.drive_links
     set upload_count = upload_count + 1, last_accessed_at = now()
   where id = v_link.id;

  insert into public.activity_events (
    organization_id, workspace_id, document_id, folder_id, drive_link_id,
    event_type, visitor_id, metadata
  ) values (
    v_link.organization_id, v_link.workspace_id, v_id, v_folder, v_link.id,
    'share_uploaded', nullif(left(coalesce(p_visitor_id, ''), 64), ''),
    jsonb_build_object('title', v_name, 'file_size', v_size, 'label', v_link.label)
  );

  perform public.create_notification(
    v_link.organization_id, v_link.workspace_id, 'share_uploaded',
    jsonb_build_object('document_id', v_id, 'document_title', v_name, 'label', v_link.label)
  );

  return jsonb_build_object('status', 'ok', 'id', v_id, 'name', v_name);
end;
$$;

-- Manifeste pour téléchargement ZIP côté client (chemins relatifs inclus).
create or replace function public.link_zip_manifest(
  p_token text, p_session text, p_folder_id uuid, p_visitor_id text
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_link   public.drive_links;
  v_root   uuid;
  v_result jsonb;
begin
  v_link := public.drive_link_active(p_token);
  if v_link.id is null or not public.drive_link_session_valid(v_link.id, p_session) then
    return null;
  end if;
  if not v_link.can_download or v_link.document_id is not null then
    return null;
  end if;

  v_root := v_link.folder_id;
  if p_folder_id is not null and public.drive_link_folder_in_scope(v_link, p_folder_id) then
    v_root := p_folder_id;
  end if;

  with recursive tree as (
    select f.id, f.name::text as path
    from public.folders f
    where f.workspace_id = v_link.workspace_id
      and f.deleted_at is null
      and f.parent_id is not distinct from v_root
    union all
    select c.id, tree.path || '/' || c.name
    from public.folders c join tree on c.parent_id = tree.id
    where c.deleted_at is null
  )
  select coalesce(jsonb_agg(jsonb_build_object('path', file_path, 'name', name, 'size', size)), '[]'::jsonb)
    into v_result
  from (
    select d.file_path, d.title as name, d.file_size as size
    from public.documents d
    where d.workspace_id = v_link.workspace_id
      and d.deleted_at is null
      and d.folder_id is not distinct from v_root
    union all
    select d.file_path, tree.path || '/' || d.title, d.file_size
    from public.documents d join tree on d.folder_id = tree.id
    where d.deleted_at is null
    limit 1000
  ) s;

  update public.drive_links
     set download_count = download_count + 1, last_accessed_at = now()
   where id = v_link.id;

  insert into public.activity_events (
    organization_id, workspace_id, folder_id, drive_link_id, event_type, visitor_id, metadata
  ) values (
    v_link.organization_id, v_link.workspace_id, v_root, v_link.id, 'share_downloaded',
    nullif(left(coalesce(p_visitor_id, ''), 64), ''),
    jsonb_build_object('zip', true, 'files', jsonb_array_length(v_result))
  );

  return v_result;
end;
$$;

revoke all on function public.link_get(text, text, uuid) from public;
grant execute on function public.link_get(text, text, uuid) to anon, authenticated;
revoke all on function public.link_unlock(text, text) from public;
grant execute on function public.link_unlock(text, text) to anon, authenticated;
revoke all on function public.link_file_access(text, text, uuid, boolean, text) from public;
grant execute on function public.link_file_access(text, text, uuid, boolean, text) to anon, authenticated;
revoke all on function public.link_record_open(text, text, text) from public;
grant execute on function public.link_record_open(text, text, text) to anon, authenticated;
revoke all on function public.link_upload_prefix(text, text) from public;
grant execute on function public.link_upload_prefix(text, text) to anon, authenticated;
revoke all on function public.link_complete_upload(text, text, uuid, text, text, text, text) from public;
grant execute on function public.link_complete_upload(text, text, uuid, text, text, text, text) to anon, authenticated;
revoke all on function public.link_zip_manifest(text, text, uuid, text) from public;
grant execute on function public.link_zip_manifest(text, text, uuid, text) to anon, authenticated;

-- Journal des créations / révocations de liens.
create or replace function public.log_drive_link_activity()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and not (old.is_active and not new.is_active) then
    return new;
  end if;

  if new.document_id is not null then
    select title into v_title from public.documents where id = new.document_id;
  elsif new.folder_id is not null then
    select name into v_title from public.folders where id = new.folder_id;
  else
    select name into v_title from public.workspaces where id = new.workspace_id;
  end if;

  insert into public.activity_events (
    organization_id, workspace_id, document_id, folder_id, drive_link_id,
    actor_id, event_type, metadata
  ) values (
    new.organization_id, new.workspace_id, new.document_id, new.folder_id, new.id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'share_created' else 'share_revoked' end,
    jsonb_build_object(
      'title', v_title,
      'label', new.label,
      'can_download', new.can_download,
      'can_upload', new.can_upload,
      'password', new.has_password,
      'expires_at', new.expires_at
    )
  );
  return new;
end;
$$;

drop trigger if exists drive_links_activity_log on public.drive_links;
create trigger drive_links_activity_log
  after insert or update of is_active on public.drive_links
  for each row execute function public.log_drive_link_activity();

-- Storage : signature anon des fichiers couverts par un lien actif « vue ».
create or replace function public.storage_object_is_shared(p_name text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    join public.drive_links l
      on l.workspace_id = d.workspace_id
     and l.is_active
     and l.can_view
     and (l.expires_at is null or l.expires_at > now())
    where d.file_path = p_name
      and d.deleted_at is null
      and public.drive_link_document_in_scope(l, d.id)
  );
$$;

revoke all on function public.storage_object_is_shared(text) from public;
grant execute on function public.storage_object_is_shared(text) to anon, authenticated;

drop policy if exists documents_storage_link_read on storage.objects;
create policy documents_storage_link_read on storage.objects
  for select to anon
  using (
    bucket_id = 'documents'
    and public.storage_object_is_shared(name)
  );

-- Storage : dépôt anonyme limité au préfixe drop/{link_id} d'un lien actif.
create or replace function public.drive_link_drop_allowed(p_org text, p_workspace text, p_link text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.drive_links l
    where l.id::text = p_link
      and l.organization_id::text = p_org
      and l.workspace_id::text = p_workspace
      and l.is_active
      and l.can_upload
      and (l.expires_at is null or l.expires_at > now())
  );
$$;

revoke all on function public.drive_link_drop_allowed(text, text, text) from public;
grant execute on function public.drive_link_drop_allowed(text, text, text) to anon, authenticated;

drop policy if exists documents_storage_link_drop on storage.objects;
create policy documents_storage_link_drop on storage.objects
  for insert to anon
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[5] = 'drop'
    and public.drive_link_drop_allowed(
      (storage.foldername(name))[2],
      (storage.foldername(name))[4],
      (storage.foldername(name))[6]
    )
  );

-- =============================================================================
-- 6. Portail client — la corbeille n'existe pas côté client
-- =============================================================================

create or replace function public.get_portal(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_link     public.share_links;
  v_org      public.organizations;
  v_ws       public.workspaces;
  v_docs     jsonb;
  v_folders  jsonb;
begin
  v_link := public.active_share_link(p_token);
  if v_link.id is null then
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
    and d.is_visible_to_client
    and d.deleted_at is null;

  with recursive visible_docs as (
    select distinct folder_id
    from public.documents
    where workspace_id = v_link.workspace_id
      and is_visible_to_client
      and deleted_at is null
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
      'client_company', v_ws.client_company,
      'logo_url', v_ws.logo_url,
      'primary_color', v_ws.primary_color,
      'slug', v_ws.slug
    ),
    'folders', v_folders,
    'documents', v_docs
  );
end;
$$;

create or replace function public.get_portal_document_path(p_token text, p_document_id uuid)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_link public.share_links;
  v_path text;
begin
  v_link := public.active_share_link(p_token);
  if v_link.id is null then
    return null;
  end if;
  select d.file_path into v_path
  from public.documents d
  where d.id = p_document_id
    and d.workspace_id = v_link.workspace_id
    and d.is_visible_to_client
    and d.allow_download
    and d.deleted_at is null;
  return v_path;
end;
$$;

create or replace function public.get_portal_preview_path(p_token text, p_document_id uuid)
returns text
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_link public.share_links;
  v_path text;
begin
  v_link := public.active_share_link(p_token);
  if v_link.id is null then
    return null;
  end if;
  select d.file_path into v_path
  from public.documents d
  where d.id = p_document_id
    and d.workspace_id = v_link.workspace_id
    and d.is_visible_to_client
    and d.deleted_at is null;
  return v_path;
end;
$$;

create or replace function public.record_portal_event(
  p_token text,
  p_event_type text,
  p_document_id uuid default null,
  p_visitor_id text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_link      public.share_links;
  v_doc_title text;
begin
  if p_event_type not in ('portal_opened', 'document_downloaded', 'document_opened') then
    return;
  end if;

  v_link := public.active_share_link(p_token);
  if v_link.id is null then
    return;
  end if;

  if p_document_id is not null then
    if not exists (
      select 1 from public.documents d
      where d.id = p_document_id
        and d.workspace_id = v_link.workspace_id
        and d.is_visible_to_client
        and d.deleted_at is null
    ) then
      return;
    end if;
  end if;

  insert into public.activity_events (
    organization_id, workspace_id, document_id, share_link_id,
    event_type, visitor_id
  )
  values (
    v_link.organization_id,
    v_link.workspace_id,
    p_document_id,
    v_link.id,
    p_event_type,
    nullif(left(coalesce(p_visitor_id, ''), 64), '')
  );

  if p_event_type = 'portal_opened' then
    if not exists (
      select 1 from public.notifications n
      where n.workspace_id = v_link.workspace_id
        and n.type = 'portal_opened'
        and n.created_at > now() - interval '4 hours'
    ) then
      perform public.create_notification(
        v_link.organization_id, v_link.workspace_id, 'portal_opened'
      );
    end if;

  elsif p_event_type in ('document_downloaded', 'document_opened') then
    if not exists (
      select 1 from public.notifications n
      where n.workspace_id = v_link.workspace_id
        and n.type = p_event_type
        and (n.metadata ->> 'document_id') = p_document_id::text
        and n.created_at > now() - interval '1 hour'
    ) then
      select title into v_doc_title
      from public.documents where id = p_document_id;

      perform public.create_notification(
        v_link.organization_id, v_link.workspace_id, p_event_type,
        jsonb_build_object(
          'document_id', p_document_id,
          'document_title', v_doc_title
        )
      );
    end if;
  end if;
end;
$$;

drop policy if exists documents_storage_portal_read on storage.objects;
create policy documents_storage_portal_read on storage.objects
  for select to anon
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.documents d
      join public.share_links sl on sl.workspace_id = d.workspace_id
      where d.file_path = name
        and d.is_visible_to_client
        and d.allow_download
        and d.deleted_at is null
        and sl.is_active
        and (sl.expires_at is null or sl.expires_at > now())
    )
  );

drop policy if exists documents_storage_portal_preview on storage.objects;
create policy documents_storage_portal_preview on storage.objects
  for select to anon
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.documents d
      join public.share_links sl on sl.workspace_id = d.workspace_id
      where d.file_path = name
        and d.is_visible_to_client
        and d.deleted_at is null
        and sl.is_active
        and (sl.expires_at is null or sl.expires_at > now())
    )
  );

-- =============================================================================
-- 7. Durcissement — triggers non appelables, search_path figé
-- =============================================================================

revoke all on function public.log_document_activity() from public, anon, authenticated;
revoke all on function public.log_folder_activity() from public, anon, authenticated;
revoke all on function public.log_access_activity() from public, anon, authenticated;
revoke all on function public.log_drive_link_activity() from public, anon, authenticated;
revoke all on function public.enforce_storage_quota() from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
