-- =============================================================================
-- Docalio — Espace personnalisé par client : sous-domaine + branding
--
-- Chaque espace client peut avoir son identifiant d'URL (slug) — pour un
-- sous-domaine de marque, ex. boulangerie-margot.docalio.app — ainsi que son
-- logo et sa couleur (déjà présents). L'accès reste protégé par le jeton secret
-- du lien de partage : le sous-domaine n'est qu'un habillage, jamais une
-- autorisation.
-- =============================================================================

alter table public.workspaces add column if not exists slug text;

-- Unicité globale du slug (un sous-domaine = un espace).
create unique index if not exists workspaces_slug_uidx
  on public.workspaces (slug)
  where slug is not null;

-- -----------------------------------------------------------------------------
-- get_portal : on expose désormais le branding de l'espace client (logo,
-- couleur, slug) en plus de celui de l'organisation, pour personnaliser le
-- portail par client. Le reste est inchangé.
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

revoke all on function public.get_portal(text) from public;
grant execute on function public.get_portal(text) to anon, authenticated;
