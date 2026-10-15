-- =============================================================================
-- Docalio — Nouvelle offre : essai Pro 30 jours, Gratuit 5 Go, recherche
-- =============================================================================

-- Essai : toute nouvelle organisation démarre avec 30 jours de plan Pro.
alter table public.organizations
  alter column trial_ends_at set default (now() + interval '30 days');

-- Les organisations encore en essai profitent du nouveau délai.
update public.organizations
   set trial_ends_at = created_at + interval '30 days'
 where plan_status = 'trial'
   and trial_ends_at is not null
   and trial_ends_at < created_at + interval '30 days';

-- Plan gratuit : 5 Go par organisation (défense en profondeur côté base).
create or replace function public.plan_storage_quota(p_plan text)
returns bigint
language sql immutable
set search_path = public
as $$
  select case p_plan
    when 'starter'  then 5::bigint * 1024 * 1024 * 1024
    when 'pro'      then 200::bigint * 1024 * 1024 * 1024
    when 'business' then 1024::bigint * 1024 * 1024 * 1024
    else null
  end;
$$;

-- Recherche instantanée : index trigram sur les noms (fichiers, dossiers, espaces).
create extension if not exists pg_trgm with schema extensions;

create index if not exists documents_title_trgm_idx
  on public.documents using gin (title extensions.gin_trgm_ops);
create index if not exists folders_name_trgm_idx
  on public.folders using gin (name extensions.gin_trgm_ops);
create index if not exists workspaces_name_trgm_idx
  on public.workspaces using gin (name extensions.gin_trgm_ops);
