-- =============================================================================
-- Docalio : le portail client ignore les fichiers à la corbeille
--
-- Mêmes fonctions qu'avant, avec un filtre `deleted_at is null` partout où
-- un fichier est exposé, résolu ou journalisé.
-- =============================================================================

create or replace function public.get_portal(p_token text)
returns jsonb
language plpgsql
stable
security definer
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
language plpgsql
stable
security definer
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
language plpgsql
stable
security definer
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

create or replace function public.get_portal_landing(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ws         public.workspaces;
  v_org        public.organizations;
  v_has_active boolean;
  v_doc_count  int;
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return null;
  end if;

  select * into v_ws from public.workspaces where slug = lower(p_slug);
  if not found then
    return null;
  end if;

  select * into v_org from public.organizations where id = v_ws.organization_id;

  select exists(
    select 1
    from public.share_links sl
    where sl.workspace_id = v_ws.id
      and sl.is_active
      and (sl.expires_at is null or sl.expires_at > now())
  ) into v_has_active;

  select count(*) into v_doc_count
  from public.documents d
  where d.workspace_id = v_ws.id
    and d.is_visible_to_client
    and d.deleted_at is null;

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
    'has_active_link', v_has_active,
    'document_count', v_doc_count
  );
end;
$$;

create or replace function public.record_portal_event(
  p_token text,
  p_event_type text,
  p_document_id uuid default null,
  p_visitor_id text default null
)
returns void
language plpgsql
security definer
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

create or replace function public.submit_document_decision(
  p_token text,
  p_document_id uuid,
  p_decision text,
  p_comment text default null,
  p_visitor_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link      public.share_links;
  v_comment   text;
  v_doc_title text;
begin
  if p_decision not in ('approved', 'rejected', 'changes_requested') then
    return null;
  end if;

  v_link := public.active_share_link(p_token);
  if v_link.id is null then
    return null;
  end if;

  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id
      and d.workspace_id = v_link.workspace_id
      and d.is_visible_to_client
      and d.deleted_at is null
  ) then
    return null;
  end if;

  v_comment := nullif(left(coalesce(p_comment, ''), 2000), '');

  insert into public.document_decisions (
    organization_id, workspace_id, document_id, share_link_id,
    decision, comment, visitor_id
  )
  values (
    v_link.organization_id, v_link.workspace_id, p_document_id, v_link.id,
    p_decision, v_comment, nullif(left(coalesce(p_visitor_id, ''), 64), '')
  )
  on conflict (document_id) do update
    set decision      = excluded.decision,
        comment       = excluded.comment,
        share_link_id = excluded.share_link_id,
        visitor_id    = excluded.visitor_id,
        updated_at    = now();

  select title into v_doc_title
  from public.documents where id = p_document_id;

  perform public.create_notification(
    v_link.organization_id, v_link.workspace_id, 'decision_received',
    jsonb_build_object(
      'document_id', p_document_id,
      'document_title', v_doc_title,
      'decision', p_decision,
      'comment', nullif(left(coalesce(v_comment, ''), 280), '')
    )
  );

  return jsonb_build_object(
    'document_id', p_document_id,
    'decision', p_decision,
    'comment', v_comment
  );
end;
$$;

alter policy documents_storage_portal_read on storage.objects
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

alter policy documents_storage_portal_preview on storage.objects
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
