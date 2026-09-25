-- =============================================================================
-- Docalio — Collecte de pièces client (« demandes de documents »)
--
-- Le cabinet liste les pièces attendues (relevés, factures, pièce d'identité…),
-- le client les dépose depuis son portail, sans compte. Le cabinet valide ou
-- refuse chaque pièce ; un refus rouvre la demande pour un nouveau dépôt.
--
-- Sécurité :
--   - RLS « par espace accessible » côté dashboard (même modèle que documents).
--   - Portail : lecture + dépôt UNIQUEMENT via RPC SECURITY DEFINER qui valident
--     le token (actif, non expiré) et l'appartenance de la demande à l'espace.
--   - Storage : policy anon INSERT strictement bornée au préfixe
--     organizations/{org}/workspaces/{ws}/requests/{request_id}/ d'une demande
--     OUVERTE (pending/rejected) rattachée à un lien actif. Aucune lecture anon
--     de ces fichiers, bucket toujours privé, aucun service_role.
--   - Les membres lisent ces fichiers via la policy existante (préfixe org).
-- =============================================================================

create table if not exists public.document_requests (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  title            text not null check (char_length(title) between 1 and 160),
  description      text check (description is null or char_length(description) <= 1000),
  due_date         date,
  status           text not null default 'pending'
                   check (status in ('pending', 'received', 'validated', 'rejected')),
  review_comment   text check (review_comment is null or char_length(review_comment) <= 1000),
  file_path        text,
  file_name        text,
  file_size        bigint,
  file_type        text,
  fulfilled_at     timestamptz,
  position         integer not null default 0,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

create index if not exists document_requests_workspace_idx
  on public.document_requests (workspace_id, position, created_at);
create index if not exists document_requests_org_idx
  on public.document_requests (organization_id);

drop trigger if exists set_document_requests_updated_at on public.document_requests;
create trigger set_document_requests_updated_at
  before update on public.document_requests
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS dashboard : par espace accessible (cf. accessible_workspace_ids()).
-- -----------------------------------------------------------------------------
alter table public.document_requests enable row level security;

drop policy if exists document_requests_select_member on public.document_requests;
create policy document_requests_select_member on public.document_requests
  for select to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists document_requests_insert_member on public.document_requests;
create policy document_requests_insert_member on public.document_requests
  for insert to authenticated
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and created_by = auth.uid()
  );

drop policy if exists document_requests_update_member on public.document_requests;
create policy document_requests_update_member on public.document_requests
  for update to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()))
  with check (workspace_id in (select public.accessible_workspace_ids()));

drop policy if exists document_requests_delete_member on public.document_requests;
create policy document_requests_delete_member on public.document_requests
  for delete to authenticated
  using (workspace_id in (select public.accessible_workspace_ids()));

-- -----------------------------------------------------------------------------
-- Types d'évènements / notifications étendus.
-- -----------------------------------------------------------------------------
alter table public.activity_events drop constraint if exists activity_events_event_type_check;
alter table public.activity_events add constraint activity_events_event_type_check
  check (event_type in (
    'portal_opened', 'document_downloaded', 'document_opened', 'request_fulfilled'
  ));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'portal_opened', 'document_downloaded', 'document_opened',
    'decision_received', 'request_received'
  ));

-- -----------------------------------------------------------------------------
-- Helper : lien actif et non expiré pour un token (NULL sinon).
-- -----------------------------------------------------------------------------
create or replace function public.active_share_link(p_token text)
returns public.share_links
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.share_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now())
  limit 1
$$;
revoke all on function public.active_share_link(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC portail : liste des pièces demandées (jamais le file_path).
-- -----------------------------------------------------------------------------
create or replace function public.get_portal_requests(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_link public.share_links;
begin
  v_link := public.active_share_link(p_token);
  if v_link.id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'title', r.title,
        'description', r.description,
        'due_date', r.due_date,
        'status', r.status,
        'review_comment', r.review_comment,
        'file_name', r.file_name,
        'fulfilled_at', r.fulfilled_at
      )
      order by r.position, r.created_at
    )
    from public.document_requests r
    where r.workspace_id = v_link.workspace_id
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.get_portal_requests(text) from public;
grant execute on function public.get_portal_requests(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC portail : préfixe de dépôt autorisé pour une demande ouverte.
-- Renvoie le préfixe Storage (le nom de fichier est construit côté serveur).
-- -----------------------------------------------------------------------------
create or replace function public.get_portal_request_upload_prefix(
  p_token text,
  p_request_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_link public.share_links;
  v_req  public.document_requests;
begin
  v_link := public.active_share_link(p_token);
  if v_link.id is null then
    return null;
  end if;

  select * into v_req
  from public.document_requests
  where id = p_request_id
    and workspace_id = v_link.workspace_id
    and status in ('pending', 'rejected');
  if not found then
    return null;
  end if;

  return 'organizations/' || v_req.organization_id
      || '/workspaces/' || v_req.workspace_id
      || '/requests/' || v_req.id || '/';
end;
$$;
revoke all on function public.get_portal_request_upload_prefix(text, uuid) from public;
grant execute on function public.get_portal_request_upload_prefix(text, uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC portail : finalise un dépôt (après upload Storage réussi).
-- Vérifie token + demande ouverte + chemin sous le bon préfixe + objet présent.
-- -----------------------------------------------------------------------------
create or replace function public.complete_portal_request(
  p_token       text,
  p_request_id  uuid,
  p_file_path   text,
  p_file_name   text,
  p_file_size   bigint,
  p_file_type   text,
  p_visitor_id  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link   public.share_links;
  v_req    public.document_requests;
  v_prefix text;
  v_name   text;
begin
  v_link := public.active_share_link(p_token);
  if v_link.id is null then
    return null;
  end if;

  select * into v_req
  from public.document_requests
  where id = p_request_id
    and workspace_id = v_link.workspace_id
    and status in ('pending', 'rejected')
  for update;
  if not found then
    return null;
  end if;

  v_prefix := 'organizations/' || v_req.organization_id
           || '/workspaces/' || v_req.workspace_id
           || '/requests/' || v_req.id || '/';

  if p_file_path is null
     or left(p_file_path, length(v_prefix)) <> v_prefix
     or position('..' in p_file_path) > 0
     or not exists (
       select 1 from storage.objects o
       where o.bucket_id = 'documents' and o.name = p_file_path
     ) then
    return null;
  end if;

  v_name := left(coalesce(nullif(p_file_name, ''), 'document'), 200);

  update public.document_requests
     set status         = 'received',
         file_path      = p_file_path,
         file_name      = v_name,
         file_size      = greatest(coalesce(p_file_size, 0), 0),
         file_type      = left(coalesce(p_file_type, ''), 120),
         fulfilled_at   = now(),
         review_comment = null
   where id = v_req.id;

  insert into public.activity_events (
    organization_id, workspace_id, share_link_id, event_type, visitor_id, metadata
  ) values (
    v_req.organization_id, v_req.workspace_id, v_link.id, 'request_fulfilled',
    nullif(left(coalesce(p_visitor_id, ''), 64), ''),
    jsonb_build_object('request_id', v_req.id, 'request_title', v_req.title)
  );

  perform public.create_notification(
    v_req.organization_id, v_req.workspace_id, 'request_received',
    jsonb_build_object('request_id', v_req.id, 'request_title', v_req.title,
                       'file_name', v_name)
  );

  return jsonb_build_object('id', v_req.id, 'status', 'received', 'file_name', v_name);
end;
$$;
revoke all on function public.complete_portal_request(text, uuid, text, text, bigint, text, text) from public;
grant execute on function public.complete_portal_request(text, uuid, text, text, bigint, text, text)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage : dépôt anon borné au préfixe d'une demande OUVERTE sous lien actif.
-- INSERT uniquement (pas de lecture, pas d'écrasement, pas de suppression).
-- -----------------------------------------------------------------------------
drop policy if exists documents_storage_portal_request_insert on storage.objects;
create policy documents_storage_portal_request_insert on storage.objects
  for insert to anon
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[5] = 'requests'
    and exists (
      select 1
      from public.document_requests r
      join public.share_links sl on sl.workspace_id = r.workspace_id
      where r.id::text = (storage.foldername(name))[6]
        and r.organization_id::text = (storage.foldername(name))[2]
        and r.workspace_id::text = (storage.foldername(name))[4]
        and r.status in ('pending', 'rejected')
        and sl.is_active
        and (sl.expires_at is null or sl.expires_at > now())
    )
  );
