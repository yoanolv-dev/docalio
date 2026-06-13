-- =============================================================================
-- Docalio — Sièges d'équipe : invitations & gestion des membres
--
-- Plusieurs personnes peuvent collaborer sur les espaces d'une même
-- organisation. L'isolation inter-organisation reste stricte (RLS). Les
-- mutations sensibles passent par des fonctions SECURITY DEFINER (anti-récursion
-- et contrôle des rôles), comme le reste du socle.
-- =============================================================================

-- Invitations à rejoindre une organisation (lien à jeton, expirable).
create table if not exists public.organization_invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  email            text,
  role             text not null default 'member'
                   check (role in ('admin', 'member')),
  token            text not null unique,
  invited_by       uuid references public.profiles (id) on delete set null,
  expires_at       timestamptz not null default (now() + interval '14 days'),
  accepted_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists organization_invites_org_idx
  on public.organization_invites (organization_id);

alter table public.organization_invites enable row level security;

-- Lecture / gestion des invitations : réservé aux owner/admin de l'organisation.
drop policy if exists invites_select_admin on public.organization_invites;
create policy invites_select_admin on public.organization_invites
  for select to authenticated
  using (public.is_org_admin(organization_id));

drop policy if exists invites_insert_admin on public.organization_invites;
create policy invites_insert_admin on public.organization_invites
  for insert to authenticated
  with check (public.is_org_admin(organization_id));

drop policy if exists invites_delete_admin on public.organization_invites;
create policy invites_delete_admin on public.organization_invites
  for delete to authenticated
  using (public.is_org_admin(organization_id));

-- -----------------------------------------------------------------------------
-- accept_org_invite : l'utilisateur courant rejoint l'organisation du jeton.
-- SECURITY DEFINER car l'invité n'a pas encore le droit d'écrire dans members.
-- -----------------------------------------------------------------------------
create or replace function public.accept_org_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.organization_invites;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select * into inv
  from public.organization_invites
  where token = p_token
  for update;

  if inv.id is null then
    raise exception 'Invitation introuvable';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Invitation déjà utilisée';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invitation expirée';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (inv.organization_id, auth.uid(), inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.organization_invites
    set accepted_at = now()
    where id = inv.id;

  return inv.organization_id;
end;
$$;

revoke all on function public.accept_org_invite(text) from public, anon;
grant execute on function public.accept_org_invite(text) to authenticated;

-- -----------------------------------------------------------------------------
-- set_member_role : un admin modifie le rôle d'un membre de SON organisation.
-- Garde-fou : ne jamais rétrograder le dernier owner.
-- -----------------------------------------------------------------------------
create or replace function public.set_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.organization_members;
  owner_count int;
begin
  if p_role not in ('owner', 'admin', 'member') then
    raise exception 'Rôle invalide';
  end if;

  select * into m from public.organization_members where id = p_member_id;
  if m.id is null then
    raise exception 'Membre introuvable';
  end if;

  if not public.is_org_admin(m.organization_id) then
    raise exception 'Action réservée aux administrateurs';
  end if;

  if m.role = 'owner' and p_role <> 'owner' then
    select count(*) into owner_count
    from public.organization_members
    where organization_id = m.organization_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'Il doit rester au moins un propriétaire';
    end if;
  end if;

  update public.organization_members set role = p_role where id = p_member_id;
end;
$$;

revoke all on function public.set_member_role(uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- remove_org_member : un admin retire un membre (ou un membre se retire
-- lui-même). Jamais le dernier owner.
-- -----------------------------------------------------------------------------
create or replace function public.remove_org_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.organization_members;
  owner_count int;
begin
  select * into m from public.organization_members where id = p_member_id;
  if m.id is null then
    return;
  end if;

  if not public.is_org_admin(m.organization_id) and m.user_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  if m.role = 'owner' then
    select count(*) into owner_count
    from public.organization_members
    where organization_id = m.organization_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'Il doit rester au moins un propriétaire';
    end if;
  end if;

  delete from public.organization_members where id = p_member_id;
end;
$$;

revoke all on function public.remove_org_member(uuid) from public, anon;
grant execute on function public.remove_org_member(uuid) to authenticated;
