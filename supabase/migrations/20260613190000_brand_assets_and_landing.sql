-- =============================================================================
-- Docalio — Identité de marque : upload de logo intégré + accueil sous-domaine
--
-- 1) Bucket `brand` PUBLIC, dédié aux logos d'organisation et d'espace client.
--    Choix assumé : un logo est une identité de marque PUBLIQUE (il s'affiche
--    sur le portail anonyme et la page d'accueil de sous-domaine). Aucune
--    donnée confidentielle n'y transite. Le bucket `documents` reste 100% privé
--    (RLS stricte, URLs signées courtes) : la sécurité des fichiers clients est
--    inchangée. Le bucket `brand` est en lecture publique (URL stable, rapide,
--    sans expiration) ; l'écriture reste cadrée par RLS aux membres de l'org.
--
-- 2) RPC `get_portal_landing(slug)` : renvoie le branding d'un espace à partir
--    de son slug, pour la page d'accueil de marque du sous-domaine. Elle NE
--    renvoie JAMAIS le jeton du lien de partage : connaître le sous-domaine ne
--    donne aucun accès aux documents. Le jeton reste l'unique secret.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket Storage public `brand` (logos uniquement, ≤ 2 Mo)
--   Chemins : organizations/{organization_id}/{scope}-{uuid}.{ext}
--   scope ∈ { org, new, {workspace_id} } — purement informatif.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand', 'brand', true, 2097152, -- 2 Mo
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Lecture publique assurée par `public = true` (URL publique stable).
-- L'écriture (insert/update/delete) reste réservée aux membres de l'organisation
-- du chemin — défense en profondeur, aucune écriture inter-organisation.
-- NB : si votre projet refuse la création de policies sur storage.objects en SQL
-- ("must be owner"), créez ces policies via Dashboard → Storage → brand → Policies.
drop policy if exists brand_storage_insert on storage.objects;
create policy brand_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand'
    and (storage.foldername(name))[1] = 'organizations'
    and ((storage.foldername(name))[2])::uuid in (select public.current_user_org_ids())
  );

drop policy if exists brand_storage_update on storage.objects;
create policy brand_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brand'
    and (storage.foldername(name))[1] = 'organizations'
    and ((storage.foldername(name))[2])::uuid in (select public.current_user_org_ids())
  )
  with check (
    bucket_id = 'brand'
    and (storage.foldername(name))[1] = 'organizations'
    and ((storage.foldername(name))[2])::uuid in (select public.current_user_org_ids())
  );

drop policy if exists brand_storage_delete on storage.objects;
create policy brand_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brand'
    and (storage.foldername(name))[1] = 'organizations'
    and ((storage.foldername(name))[2])::uuid in (select public.current_user_org_ids())
  );

-- -----------------------------------------------------------------------------
-- RPC publique : accueil de marque du sous-domaine, à partir du slug d'espace.
--   Renvoie le branding (org + espace) et l'état du lien (actif ? combien de
--   documents ?). JAMAIS le jeton : le sous-domaine est un habillage, pas une
--   autorisation. Renvoie NULL si le slug est inconnu.
-- -----------------------------------------------------------------------------
create or replace function public.get_portal_landing(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
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
    and d.is_visible_to_client;

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

revoke all on function public.get_portal_landing(text) from public;
grant execute on function public.get_portal_landing(text) to anon, authenticated;
