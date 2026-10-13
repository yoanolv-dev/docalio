-- =============================================================================
-- Docalio : Drive d'entreprise (3/4) : journal d'activité complet et
-- double authentification
--
-- Journal : alimenté par des triggers (impossible à oublier côté code, et
-- couvre aussi les appels directs à l'API). Une suppression de dossier ne
-- produit qu'une entrée (pas une par fichier). Les actions anonymes (liens
-- publics) sont journalisées par leurs propres RPC.
--
-- 2FA : si un utilisateur a un facteur vérifié, seules ses sessions aal2
-- accèdent aux données (policies RESTRICTIVE, combinées en ET aux autres).
-- =============================================================================

alter table public.activity_events
  add column if not exists actor_id uuid references public.profiles (id) on delete set null,
  add column if not exists folder_id uuid;

alter table public.activity_events
  drop constraint if exists activity_events_event_type_check;
alter table public.activity_events
  add constraint activity_events_event_type_check
  check (event_type in (
    'portal_opened', 'document_downloaded', 'document_opened', 'request_fulfilled',
    'file_uploaded', 'file_version_uploaded', 'file_version_restored',
    'file_renamed', 'file_moved', 'file_trashed', 'file_restored', 'file_deleted',
    'file_downloaded',
    'folder_created', 'folder_renamed', 'folder_moved', 'folder_trashed',
    'folder_restored', 'folder_deleted',
    'share_created', 'share_revoked', 'share_opened', 'share_downloaded', 'share_uploaded',
    'access_granted', 'access_revoked'
  ));

create index if not exists activity_events_org_created_idx
  on public.activity_events (organization_id, created_at desc);
create index if not exists activity_events_actor_idx
  on public.activity_events (actor_id);

-- Lecture : membres, espaces accessibles uniquement (les invités n'y ont pas
-- accès ; un espace interne fermé reste fermé).
alter policy activity_events_select_member on public.activity_events
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

-- Les téléchargements sont journalisés par l'application, au nom de l'auteur.
create policy activity_events_insert_actor on public.activity_events
  for insert to authenticated
  with check (
    actor_id = auth.uid()
    and workspace_id in (select public.accessible_workspace_ids())
    and event_type = 'file_downloaded'
  );

create or replace function public.log_document_activity()
returns trigger
language plpgsql
security definer
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
    -- Suppression en cascade (espace ou dossier supprimé) : pas d'entrée par fichier.
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

create or replace trigger documents_activity_log
  after insert or update on public.documents
  for each row execute function public.log_document_activity();

create or replace trigger documents_activity_log_removal
  after delete on public.documents
  for each row execute function public.log_document_activity();

create or replace function public.log_folder_activity()
returns trigger
language plpgsql
security definer
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

create or replace trigger folders_activity_log
  after insert or update on public.folders
  for each row execute function public.log_folder_activity();

create or replace trigger folders_activity_log_removal
  after delete on public.folders
  for each row execute function public.log_folder_activity();

-- Accès ouverts / retirés à une personne ou un groupe.
create or replace function public.log_access_activity()
returns trigger
language plpgsql
security definer
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
                                and public.is_org_guest(v_row.organization_id, v_row.user_id))
  );
  return coalesce(new, old);
end;
$$;

create or replace trigger workspace_access_activity_log
  after insert on public.workspace_access
  for each row execute function public.log_access_activity();

create or replace trigger workspace_access_activity_log_removal
  after delete on public.workspace_access
  for each row execute function public.log_access_activity();

revoke all on function public.log_document_activity() from public, anon, authenticated;
revoke all on function public.log_folder_activity() from public, anon, authenticated;
revoke all on function public.log_access_activity() from public, anon, authenticated;

-- --- Double authentification -----------------------------------------------------

create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
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
    'workspaces', 'documents', 'folders', 'document_versions', 'share_links',
    'document_requests', 'document_decisions', 'activity_events',
    'workspace_access', 'notifications', 'organization_invites',
    'organization_groups', 'organization_group_members'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = t || '_mfa'
    ) then
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated '
        'using ((select public.mfa_satisfied())) with check ((select public.mfa_satisfied()))',
        t || '_mfa', t
      );
    end if;
  end loop;
end;
$$;

create policy documents_storage_mfa on storage.objects
  as restrictive
  for all to authenticated
  using (bucket_id <> 'documents' or (select public.mfa_satisfied()))
  with check (bucket_id <> 'documents' or (select public.mfa_satisfied()));
