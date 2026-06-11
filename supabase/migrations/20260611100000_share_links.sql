-- =============================================================================
-- Docalio — Sprint 6 — Portail client (liens de partage)
-- Table share_links + RLS (dashboard) + RPC publiques SECURITY DEFINER (portail)
-- + policy Storage anon strictement cadrée. Aucun secret, bucket jamais public.
-- =============================================================================

create table if not exists public.share_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  token            text not null unique,
  expires_at       timestamptz,
  is_active        boolean not null default true,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  -- Le workspace doit appartenir à la même organisation (intégrité au niveau base)
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

create index if not exists share_links_workspace_id_idx on public.share_links (workspace_id);
create index if not exists share_links_organization_id_idx on public.share_links (organization_id);
-- Au plus UN lien actif par workspace
create unique index if not exists share_links_one_active_per_workspace
  on public.share_links (workspace_id) where is_active;

-- -----------------------------------------------------------------------------
-- RLS (côté dashboard) : un membre ne gère que les liens de son organisation
-- -----------------------------------------------------------------------------
alter table public.share_links enable row level security;

drop policy if exists share_links_select_member on public.share_links;
create policy share_links_select_member on public.share_links
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists share_links_insert_member on public.share_links;
create policy share_links_insert_member on public.share_links
  for insert to authenticated
  with check (
    organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

drop policy if exists share_links_update_member on public.share_links;
create policy share_links_update_member on public.share_links
  for update to authenticated
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists share_links_delete_member on public.share_links;
create policy share_links_delete_member on public.share_links
  for delete to authenticated
  using (organization_id in (select public.current_user_org_ids()));

-- -----------------------------------------------------------------------------
-- RPC publique : données du portail à partir d'un token (SECURITY DEFINER).
-- Ne renvoie QUE les documents visibles ; file_path seulement si téléchargeable.
-- Renvoie NULL si le token est inconnu, inactif ou expiré.
-- -----------------------------------------------------------------------------
create or replace function public.get_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_link  public.share_links;
  v_org   public.organizations;
  v_ws    public.workspaces;
  v_docs  jsonb;
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
    'documents', v_docs
  );
end;
$$;

revoke all on function public.get_portal(text) from public;
grant execute on function public.get_portal(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC publique : résout le chemin Storage d'un document du portail.
-- Renvoie le file_path UNIQUEMENT si visible + téléchargeable + lien actif.
-- -----------------------------------------------------------------------------
create or replace function public.get_portal_document_path(
  p_token text,
  p_document_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_path text;
begin
  select d.file_path into v_path
  from public.documents d
  join public.share_links sl on sl.workspace_id = d.workspace_id
  where sl.token = p_token
    and sl.is_active
    and (sl.expires_at is null or sl.expires_at > now())
    and d.id = p_document_id
    and d.is_visible_to_client
    and d.allow_download;

  return v_path; -- NULL si non autorisé
end;
$$;

revoke all on function public.get_portal_document_path(text, uuid) from public;
grant execute on function public.get_portal_document_path(text, uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage : autorise le rôle anon à SIGNER (createSignedUrl) uniquement les
-- fichiers visibles + téléchargeables rattachés à un lien actif non expiré.
-- Le bucket reste privé ; aucune lecture directe possible.
-- -----------------------------------------------------------------------------
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
        and sl.is_active
        and (sl.expires_at is null or sl.expires_at > now())
    )
  );
