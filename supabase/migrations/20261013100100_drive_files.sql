-- =============================================================================
-- Docalio : Drive d'entreprise (2/4) : corbeille, versions, quota par forfait
-- et envoi direct de fichiers vers le Storage
--
-- Toutes les fonctions « drive_* » sont SECURITY INVOKER : elles s'exécutent
-- avec les droits de l'utilisateur, la RLS décide de ce qui est visible ou
-- modifiable. La suppression définitive passe par l'application (PostgREST et
-- API Storage, sous RLS) à partir du plan renvoyé par drive_purge_plan().
-- =============================================================================

-- --- Colonnes ------------------------------------------------------------------

alter table public.documents
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null,
  add column if not exists trash_batch uuid,
  add column if not exists version integer not null default 1,
  add column if not exists file_updated_at timestamptz not null default now(),
  add column if not exists file_updated_by uuid references public.profiles (id) on delete set null;

alter table public.folders
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles (id) on delete set null,
  add column if not exists trash_batch uuid;

-- Le nom affiché d'un fichier porte désormais son extension (« Contrat.pdf »).
update public.documents
set title = title || '.' || substring(file_path from '\.([A-Za-z0-9]{1,8})$')
where title !~ '\.[A-Za-z0-9]{1,8}$'
  and file_path ~ '\.[A-Za-z0-9]{1,8}$';

update public.documents
set file_updated_at = created_at,
    file_updated_by = created_by
where file_updated_by is null;

create unique index if not exists documents_id_workspace_id_uidx
  on public.documents (id, workspace_id);
create index if not exists documents_live_folder_idx
  on public.documents (workspace_id, folder_id) where deleted_at is null;
create index if not exists documents_trash_idx
  on public.documents (workspace_id, deleted_at) where deleted_at is not null;
create index if not exists documents_recent_idx
  on public.documents (organization_id, file_updated_at desc) where deleted_at is null;
create index if not exists folders_trash_idx
  on public.folders (workspace_id, deleted_at) where deleted_at is not null;

-- --- Historique des versions ---------------------------------------------------
-- La ligne documents porte toujours la version courante ; les précédentes
-- vivent ici (fichier, taille, auteur et date de dépôt).

create table if not exists public.document_versions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  document_id      uuid not null references public.documents (id) on delete cascade,
  version          integer not null,
  file_path        text not null,
  file_size        bigint,
  file_type        text,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (document_id, version),
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

create index if not exists document_versions_document_idx
  on public.document_versions (document_id);
create index if not exists document_versions_org_idx
  on public.document_versions (organization_id);

alter table public.document_versions enable row level security;

create policy document_versions_select on public.document_versions
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

create policy document_versions_write on public.document_versions
  for all to authenticated
  using (workspace_id in (select public.writable_workspace_ids()))
  with check (workspace_id in (select public.writable_workspace_ids()));

-- --- Corbeille -------------------------------------------------------------------

-- Éléments affichés dans la corbeille : la racine de chaque suppression (un
-- dossier supprimé n'affiche pas chacun de ses fichiers). Droits de l'appelant.
create or replace view public.drive_trash_items
with (security_invoker = true)
as
  select
    'folder'::text as kind,
    f.id,
    f.organization_id,
    f.workspace_id,
    f.parent_id as folder_id,
    f.name as name,
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
  select
    'file'::text as kind,
    d.id,
    d.organization_id,
    d.workspace_id,
    d.folder_id,
    d.title as name,
    d.file_type,
    coalesce(d.file_size, 0)::bigint as size,
    d.deleted_at,
    d.deleted_by
  from public.documents d
  where d.deleted_at is not null
    and not exists (
      select 1 from public.folders p
      where p.id = d.folder_id and p.trash_batch = d.trash_batch
    );

grant select on public.drive_trash_items to authenticated;

-- Mise à la corbeille : dossiers (avec tout leur contenu) et fichiers, en un
-- seul lot restaurable.
create or replace function public.drive_trash(
  p_folder_ids uuid[],
  p_document_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
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
revoke all on function public.drive_trash(uuid[], uuid[]) from public, anon;
grant execute on function public.drive_trash(uuid[], uuid[]) to authenticated;

-- Restauration. Un élément dont le dossier parent est toujours à la corbeille
-- revient à la racine de son espace.
create or replace function public.drive_restore(
  p_folder_ids uuid[],
  p_document_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
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

  -- Fichiers d'abord : le journal reconnaît ainsi ceux restaurés avec leur dossier.
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

  -- Le journal n'inscrit que les dossiers explicitement restaurés (racines).
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
revoke all on function public.drive_restore(uuid[], uuid[]) from public, anon;
grant execute on function public.drive_restore(uuid[], uuid[]) to authenticated;

-- Plan de suppression définitive d'éléments déjà à la corbeille : dossiers
-- racines (leur contenu part en cascade), fichiers isolés et chemins Storage à
-- effacer (fichiers + anciennes versions). Lecture seule.
create or replace function public.drive_purge_plan(
  p_folder_ids uuid[],
  p_document_ids uuid[]
)
returns jsonb
language plpgsql
stable
security invoker
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
revoke all on function public.drive_purge_plan(uuid[], uuid[]) from public, anon;
grant execute on function public.drive_purge_plan(uuid[], uuid[]) to authenticated;

-- Tous les chemins Storage d'un espace (suppression complète d'un espace).
create or replace function public.drive_workspace_file_paths(p_workspace_id uuid)
returns text[]
language sql
stable
security invoker
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
revoke all on function public.drive_workspace_file_paths(uuid) from public, anon;
grant execute on function public.drive_workspace_file_paths(uuid) to authenticated;

-- --- Quota de stockage par forfait (miroir de src/lib/plans.ts) --------------

create or replace function public.plan_storage_quota(p_plan text)
returns bigint
language sql
immutable
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
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(file_size) from public.documents where organization_id = p_org), 0)::bigint
    + coalesce((select sum(file_size) from public.document_versions where organization_id = p_org), 0)::bigint;
$$;
revoke all on function public.organization_storage_used(uuid) from public, anon, authenticated;

create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
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
revoke all on function public.enforce_storage_quota() from public, anon, authenticated;

create or replace trigger documents_storage_quota
  before insert or update of file_size on public.documents
  for each row execute function public.enforce_storage_quota();

-- Usage : stockage (versions comprises), espaces actifs, membres hors invités.
create or replace function public.get_organization_usage(org_id uuid)
returns table (storage_used bigint, active_workspaces integer, members_count integer)
language sql
stable
security definer
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

create or replace function public.get_organization_guest_count(org_id uuid)
returns integer
language sql
stable
security definer
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

-- --- Envoi de fichiers ------------------------------------------------------------
-- Le navigateur dépose le fichier directement dans le bucket privé (RLS
-- Storage : droit d'écriture sur l'espace), puis appelle cette fonction qui
-- vérifie l'objet, lit sa taille réelle et crée le fichier, ou une nouvelle
-- version d'un fichier existant.
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
security invoker
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
revoke all on function public.drive_register_upload(uuid, uuid, text, text, text, uuid) from public, anon;
grant execute on function public.drive_register_upload(uuid, uuid, text, text, text, uuid) to authenticated;

-- Restaure une ancienne version : elle redevient le fichier courant (nouveau
-- numéro) et l'actuelle prend sa place dans l'historique. Aucun octet copié,
-- aucun octet compté en double.
create or replace function public.drive_restore_version(p_version_id uuid)
returns jsonb
language plpgsql
security invoker
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
revoke all on function public.drive_restore_version(uuid) from public, anon;
grant execute on function public.drive_restore_version(uuid) to authenticated;

-- Crée (si besoin) une arborescence de dossiers et renvoie le dernier : import
-- d'un dossier entier depuis l'ordinateur.
create or replace function public.drive_ensure_folder_path(
  p_workspace_id uuid,
  p_parent_id uuid,
  p_names text[]
)
returns uuid
language plpgsql
security invoker
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
revoke all on function public.drive_ensure_folder_path(uuid, uuid, text[]) from public, anon;
grant execute on function public.drive_ensure_folder_path(uuid, uuid, text[]) to authenticated;

-- Compteurs des dossiers affichés : fichiers et sous-dossiers directs, octets
-- de tout le sous-arbre.
create or replace function public.drive_folder_stats(p_folder_ids uuid[])
returns table (folder_id uuid, files integer, folders integer, bytes bigint)
language sql
stable
security invoker
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
revoke all on function public.drive_folder_stats(uuid[]) from public, anon;
grant execute on function public.drive_folder_stats(uuid[]) to authenticated;
