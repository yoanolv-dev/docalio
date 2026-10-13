-- =============================================================================
-- Docalio : compteurs par espace pour l'accueil du Drive (fichiers, octets,
-- dernier dépôt). SECURITY INVOKER : seuls les fichiers visibles comptent.
-- =============================================================================

create or replace function public.drive_workspace_stats(p_org uuid)
returns table (workspace_id uuid, files integer, bytes bigint, last_file_at timestamptz)
language sql
stable
security invoker
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
revoke all on function public.drive_workspace_stats(uuid) from public, anon;
grant execute on function public.drive_workspace_stats(uuid) to authenticated;
