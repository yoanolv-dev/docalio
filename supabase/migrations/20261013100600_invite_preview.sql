-- =============================================================================
-- Docalio : aperçu d'une invitation avant connexion (nom de l'organisation,
-- rôle, espaces ouverts). Le jeton de 192 bits reste l'unique secret ; rien
-- n'est renvoyé pour une invitation expirée ou déjà acceptée.
-- =============================================================================

create or replace function public.get_invite_preview(p_token text)
returns jsonb
language sql
stable
security definer
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
