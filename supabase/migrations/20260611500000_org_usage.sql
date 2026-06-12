-- =============================================================================
-- Docalio — Sprint 9 — Usage d'organisation & plafond fichier
--
-- 1. RPC `get_organization_usage` : agrège l'usage courant côté base (stockage,
--    espaces actifs, membres) sans remonter de lignes. SECURITY DEFINER pour
--    pouvoir agréger, mais ne renvoie de résultat que si l'appelant est membre
--    de l'organisation (garde via current_user_org_ids()). Aucun accès inter-org.
--
-- 2. Plafond de taille du bucket `documents` relevé à 1 Go (offre Business),
--    car les plans autorisent désormais des fichiers > 20 Mo. La limite par
--    plan est appliquée côté serveur (cf. src/lib/plans.ts) ; le bucket borne
--    en défense en profondeur. Le bucket reste **privé** (public = false).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Usage agrégé de l'organisation
-- -----------------------------------------------------------------------------
create or replace function public.get_organization_usage(org_id uuid)
returns table (
  storage_used      bigint,
  active_workspaces integer,
  members_count     integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce(
      (select sum(d.file_size) from public.documents d
       where d.organization_id = org_id),
      0
    )::bigint as storage_used,
    (select count(*) from public.workspaces w
     where w.organization_id = org_id and w.status = 'active')::integer
      as active_workspaces,
    (select count(*) from public.organization_members m
     where m.organization_id = org_id)::integer as members_count
  -- Garde d'isolation : aucune ligne si l'appelant n'est pas membre de l'org.
  where org_id in (select public.current_user_org_ids());
$$;

revoke all on function public.get_organization_usage(uuid) from public, anon;
grant execute on function public.get_organization_usage(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Plafond fichier du bucket privé `documents` : 20 Mo → 1 Go (toujours privé)
-- -----------------------------------------------------------------------------
update storage.buckets
  set file_size_limit = 1073741824 -- 1 Go
  where id = 'documents';
