-- =============================================================================
-- Docalio — Sprint 2 — Sécurité (Row Level Security) & fonctions
--
-- Principe : isolation stricte entre organisations. Aucun accès inter-org.
-- Les fonctions SECURITY DEFINER contournent volontairement la RLS pour
-- éviter la récursion infinie dans les policies de organization_members.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers SECURITY DEFINER (évitent la récursion RLS)
-- -----------------------------------------------------------------------------

-- Organisations auxquelles l'utilisateur courant appartient.
create or replace function public.current_user_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

-- Utilisateurs partageant au moins une organisation avec l'utilisateur courant.
create or replace function public.current_user_comember_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select distinct user_id
  from public.organization_members
  where organization_id in (
    select organization_id
    from public.organization_members
    where user_id = auth.uid()
  );
$$;

-- L'utilisateur courant est-il owner/admin de l'organisation donnée ?
create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = org
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- -----------------------------------------------------------------------------
-- Activation de la RLS
-- -----------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
--  - lecture : son propre profil + ceux des membres de ses organisations
--  - écriture : uniquement son propre profil
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or id in (select public.current_user_comember_ids())
  );

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations
--  - lecture : uniquement les organisations dont on est membre
--  - mise à jour : uniquement owner/admin
--  - création : via la fonction create_organization (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (id in (select public.current_user_org_ids()));

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- -----------------------------------------------------------------------------
-- organization_members
--  - lecture : uniquement les membres de ses propres organisations
--  - écriture : via create_organization pour l'instant (Sprint 2)
-- -----------------------------------------------------------------------------
drop policy if exists members_select_same_org on public.organization_members;
create policy members_select_same_org on public.organization_members
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

-- -----------------------------------------------------------------------------
-- create_organization : création atomique org + membership owner
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  org_name  text,
  org_slug  text,
  org_color text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  insert into public.organizations (name, slug, primary_color)
  values (org_name, org_slug, org_color)
  returning * into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

revoke all on function public.create_organization(text, text, text) from public, anon;
grant execute on function public.create_organization(text, text, text) to authenticated;
