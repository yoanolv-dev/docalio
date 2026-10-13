-- =============================================================================
-- Docalio : Drive d'entreprise (4/4) : liens de partage sur un fichier, un
-- dossier ou un espace entier
--
-- Options : consulter, télécharger, déposer des fichiers ; mot de passe ;
-- expiration ; révocation ; compteurs d'ouvertures, téléchargements, dépôts.
-- Le portail client historique (share_links, un par espace, pièces demandées
-- et décisions) reste inchangé ; il ignore désormais les fichiers à la
-- corbeille.
--
-- Sécurité :
--  - mot de passe haché (bcrypt) dans une table SANS policy : ni les membres
--    ni les visiteurs ne peuvent la lire ;
--  - 8 essais faux verrouillent le lien 15 minutes ;
--  - un visiteur déverrouillé reçoit un jeton de session (haché en base) ;
--  - un visiteur anonyme ne lit un objet Storage que s'il est couvert par un
--    lien actif, et ne dépose que dans le dossier de dépôt de ce lien.
-- =============================================================================

create table if not exists public.drive_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  folder_id        uuid,
  document_id      uuid,
  token            text not null unique,
  can_view         boolean not null default true,
  can_download     boolean not null default true,
  can_upload       boolean not null default false,
  has_password     boolean not null default false,
  label            text check (label is null or char_length(label) <= 120),
  expires_at       timestamptz,
  is_active        boolean not null default true,
  revoked_at       timestamptz,
  view_count       integer not null default 0,
  download_count   integer not null default 0,
  upload_count     integer not null default 0,
  last_accessed_at timestamptz,
  failed_attempts  integer not null default 0,
  locked_until     timestamptz,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade,
  foreign key (folder_id, workspace_id)
    references public.folders (id, workspace_id) on delete cascade,
  foreign key (document_id, workspace_id)
    references public.documents (id, workspace_id) on delete cascade,
  check (num_nonnulls(folder_id, document_id) <= 1),
  check (document_id is null or not can_upload),
  check (can_view or can_upload),
  check (can_view or not can_download)
);

create index if not exists drive_links_workspace_idx on public.drive_links (workspace_id);
create index if not exists drive_links_org_idx on public.drive_links (organization_id, created_at desc);
create index if not exists drive_links_folder_idx on public.drive_links (folder_id);
create index if not exists drive_links_document_idx on public.drive_links (document_id);

create or replace trigger set_drive_links_updated_at
  before update on public.drive_links
  for each row execute function public.set_updated_at();

alter table public.drive_links enable row level security;

create policy drive_links_select_member on public.drive_links
  for select to authenticated
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

create policy drive_links_insert_member on public.drive_links
  for insert to authenticated
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

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

create policy drive_links_mfa on public.drive_links
  as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

-- Secrets et sessions : RLS activée, aucune policy (fonctions DEFINER seules).
create table if not exists public.drive_link_secrets (
  link_id        uuid primary key references public.drive_links (id) on delete cascade,
  password_hash  text,
  updated_at     timestamptz not null default now()
);
alter table public.drive_link_secrets enable row level security;

create table if not exists public.drive_link_sessions (
  id             uuid primary key default gen_random_uuid(),
  link_id        uuid not null references public.drive_links (id) on delete cascade,
  token_hash     text not null unique,
  expires_at     timestamptz not null default (now() + interval '12 hours'),
  created_at     timestamptz not null default now()
);
create index if not exists drive_link_sessions_link_idx on public.drive_link_sessions (link_id);
alter table public.drive_link_sessions enable row level security;

alter table public.activity_events
  add column if not exists drive_link_id uuid references public.drive_links (id) on delete set null;
create index if not exists activity_events_drive_link_idx on public.activity_events (drive_link_id);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'portal_opened', 'document_downloaded', 'document_opened',
    'decision_received', 'request_received', 'share_uploaded'
  ));

-- --- Création et modification (membres) ----------------------------------------

create or replace function public.drive_new_token()
returns text
language sql
volatile
set search_path = public
as $$
  select translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');
$$;
revoke all on function public.drive_new_token() from public, anon, authenticated;

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
language plpgsql
security definer
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
revoke all on function public.create_drive_link(uuid, uuid, uuid, boolean, boolean, boolean, timestamptz, text, text) from public, anon;
grant execute on function public.create_drive_link(uuid, uuid, uuid, boolean, boolean, boolean, timestamptz, text, text) to authenticated;

-- p_password : null = inchangé, '' = retirer, autre = nouveau mot de passe
-- (les sessions ouvertes sont alors invalidées).
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
language plpgsql
security definer
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
revoke all on function public.update_drive_link(uuid, boolean, boolean, boolean, timestamptz, boolean, text, text) from public, anon;
grant execute on function public.update_drive_link(uuid, boolean, boolean, boolean, timestamptz, boolean, text, text) to authenticated;

-- Journal : création et révocation des liens.
create or replace function public.log_drive_link_activity()
returns trigger
language plpgsql
security definer
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
revoke all on function public.log_drive_link_activity() from public, anon, authenticated;

create or replace trigger drive_links_activity_log
  after insert or update of is_active on public.drive_links
  for each row execute function public.log_drive_link_activity();

-- --- Résolution d'un lien (fonctions internes, non exposées) ------------------

create or replace function public.drive_link_active(p_token text)
returns public.drive_links
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.drive_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now())
  limit 1;
$$;
revoke all on function public.drive_link_active(text) from public, anon, authenticated;

create or replace function public.drive_link_session_valid(p_link_id uuid, p_session text)
returns boolean
language sql
stable
security definer
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
revoke all on function public.drive_link_session_valid(uuid, text) from public, anon, authenticated;

-- Dossier dans la portée du lien : le dossier du lien et ses descendants, ou
-- tout l'espace pour un lien d'espace.
create or replace function public.drive_link_folder_in_scope(p_link public.drive_links, p_folder uuid)
returns boolean
language sql
stable
security definer
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
revoke all on function public.drive_link_folder_in_scope(public.drive_links, uuid) from public, anon, authenticated;

create or replace function public.drive_link_document_in_scope(p_link public.drive_links, p_document uuid)
returns boolean
language sql
stable
security definer
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
revoke all on function public.drive_link_document_in_scope(public.drive_links, uuid) from public, anon, authenticated;

-- Utilisées par les policies Storage (évaluées avec le rôle anon).
create or replace function public.storage_object_is_shared(p_name text)
returns boolean
language sql
stable
security definer
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

create or replace function public.drive_link_drop_allowed(p_org text, p_workspace text, p_link text)
returns boolean
language sql
stable
security definer
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

create policy documents_storage_link_read on storage.objects
  for select to anon
  using (bucket_id = 'documents' and public.storage_object_is_shared(name));

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

-- --- RPC publiques de la page /s/{jeton} -----------------------------------------

create or replace function public.link_unlock(p_token text, p_password text)
returns jsonb
language plpgsql
security definer
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
revoke all on function public.link_unlock(text, text) from public;
grant execute on function public.link_unlock(text, text) to anon, authenticated;

-- Contenu d'un lien : marque de l'organisation, droits, contenu du dossier
-- demandé (dans la portée du lien).
create or replace function public.link_get(
  p_token text,
  p_session text,
  p_folder_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
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
revoke all on function public.link_get(text, text, uuid) from public;
grant execute on function public.link_get(text, text, uuid) to anon, authenticated;

-- Ouverture (compteur + journal, une fois par visiteur et par heure).
create or replace function public.link_record_open(
  p_token text,
  p_session text,
  p_visitor_id text
)
returns void
language plpgsql
security definer
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
revoke all on function public.link_record_open(text, text, text) from public;
grant execute on function public.link_record_open(text, text, text) to anon, authenticated;

-- Accès à un fichier : renvoie son chemin Storage (aperçu ou téléchargement
-- selon les droits) ; le serveur signe ensuite une URL de courte durée.
create or replace function public.link_file_access(
  p_token text,
  p_session text,
  p_document_id uuid,
  p_download boolean,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
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
revoke all on function public.link_file_access(text, text, uuid, boolean, text) from public;
grant execute on function public.link_file_access(text, text, uuid, boolean, text) to anon, authenticated;

-- Fichiers d'un dossier du lien (sous-dossiers compris) pour un ZIP.
-- Plafonné à 1 000 fichiers.
create or replace function public.link_zip_manifest(
  p_token text,
  p_session text,
  p_folder_id uuid,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
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
revoke all on function public.link_zip_manifest(text, text, uuid, text) from public;
grant execute on function public.link_zip_manifest(text, text, uuid, text) to anon, authenticated;

create or replace function public.link_upload_prefix(p_token text, p_session text)
returns text
language plpgsql
stable
security definer
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
revoke all on function public.link_upload_prefix(text, text) from public;
grant execute on function public.link_upload_prefix(text, text) to anon, authenticated;

-- Fichier déposé par un visiteur : il rejoint le dossier du lien (ou le
-- sous-dossier ouvert), invisible du portail client par défaut.
create or replace function public.link_complete_upload(
  p_token text,
  p_session text,
  p_folder_id uuid,
  p_path text,
  p_name text,
  p_type text,
  p_visitor_id text
)
returns jsonb
language plpgsql
security definer
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
revoke all on function public.link_complete_upload(text, text, uuid, text, text, text, text) from public;
grant execute on function public.link_complete_upload(text, text, uuid, text, text, text, text) to anon, authenticated;
