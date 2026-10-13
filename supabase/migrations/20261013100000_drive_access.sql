-- =============================================================================
-- Docalio : Drive d'entreprise (1/4) : invités externes et droits par espace
--
-- - Rôle « guest » : un invité ne voit QUE les espaces ouverts à son nom
--   (workspace_access), en lecture (viewer) ou en écriture (editor). Il ne voit
--   ni l'annuaire de l'équipe, ni les liens, ni le journal, ni les
--   notifications.
-- - current_user_org_ids() exclut désormais les invités : toutes les policies
--   « équipe » existantes deviennent automatiquement inaccessibles aux invités.
-- - Lecture = accessible_workspace_ids(), écriture = writable_workspace_ids().
-- - Stockage cloisonné par ESPACE (et non plus par organisation).
--
-- Migration additive et rétrocompatible : les policies existantes sont
-- modifiées en place (ALTER POLICY), aucune donnée n'est supprimée.
-- =============================================================================

-- --- Rôles, invitations, niveau d'accès ---------------------------------------

alter table public.organization_members
  drop constraint if exists organization_members_role_check;
alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'member', 'guest'));

alter table public.organization_invites
  drop constraint if exists organization_invites_role_check;
alter table public.organization_invites
  add constraint organization_invites_role_check
  check (role in ('admin', 'member', 'guest'));

alter table public.organization_invites
  add column if not exists workspace_ids uuid[] not null default '{}',
  add column if not exists access_level text not null default 'editor';
alter table public.organization_invites
  drop constraint if exists organization_invites_access_level_check;
alter table public.organization_invites
  add constraint organization_invites_access_level_check
  check (access_level in ('viewer', 'editor'));

alter table public.workspace_access
  add column if not exists access_level text not null default 'editor';
alter table public.workspace_access
  drop constraint if exists workspace_access_access_level_check;
alter table public.workspace_access
  add constraint workspace_access_access_level_check
  check (access_level in ('viewer', 'editor'));

-- Politique de sécurité de l'organisation : 2FA obligatoire pour l'équipe.
alter table public.organizations
  add column if not exists require_mfa boolean not null default false;

-- --- Fonctions d'accès ---------------------------------------------------------

-- Organisations dont l'utilisateur est MEMBRE (invités exclus).
create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
    and role <> 'guest';
$$;

-- Toutes les organisations de l'utilisateur, invités compris (nom et logo de
-- l'organisation qui l'a invité).
create or replace function public.current_user_all_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;
revoke all on function public.current_user_all_org_ids() from public, anon;
grant execute on function public.current_user_all_org_ids() to authenticated;

-- Profils visibles : ceux des organisations dont on est membre, et le sien.
create or replace function public.current_user_comember_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct m.user_id
  from public.organization_members m
  where m.organization_id in (select public.current_user_org_ids())
  union
  select auth.uid() where auth.uid() is not null;
$$;

create or replace function public.is_org_guest(org uuid, member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org and user_id = member and role = 'guest'
  );
$$;
revoke all on function public.is_org_guest(uuid, uuid) from public, anon;
grant execute on function public.is_org_guest(uuid, uuid) to authenticated;

-- Espaces de l'utilisateur (p_write = true : seulement ceux où il écrit).
--  - Membre : espaces externes, ceux qu'il a créés, tous s'il est admin, et
--    les espaces internes ouverts à lui ou à l'un de ses groupes.
--  - Invité : uniquement les espaces ouverts explicitement à son nom.
create or replace function public.workspace_ids_for_current_user(p_write boolean)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select w.id
  from public.workspaces w
  where (
      w.organization_id in (select public.current_user_org_ids())
      and (
        w.space_type = 'external'
        or public.is_org_admin(w.organization_id)
        or w.created_by = auth.uid()
        or exists (
          select 1
          from public.workspace_access wa
          where wa.workspace_id = w.id
            and (not p_write or wa.access_level = 'editor')
            and (
              wa.user_id = auth.uid()
              or wa.group_id in (
                select gm.group_id
                from public.organization_group_members gm
                where gm.user_id = auth.uid()
              )
            )
        )
      )
    )
    or exists (
      select 1
      from public.workspace_access wa
      join public.organization_members m
        on m.organization_id = wa.organization_id
       and m.user_id = auth.uid()
       and m.role = 'guest'
      where wa.workspace_id = w.id
        and wa.user_id = auth.uid()
        and (not p_write or wa.access_level = 'editor')
    );
$$;
revoke all on function public.workspace_ids_for_current_user(boolean) from public, anon;
grant execute on function public.workspace_ids_for_current_user(boolean) to authenticated;

create or replace function public.accessible_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_ids_for_current_user(false);
$$;

create or replace function public.writable_workspace_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_ids_for_current_user(true);
$$;
revoke all on function public.writable_workspace_ids() from public, anon;
grant execute on function public.writable_workspace_ids() to authenticated;

create or replace function public.can_write_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_workspace_id in (select public.writable_workspace_ids());
$$;
revoke all on function public.can_write_workspace(uuid) from public, anon;
grant execute on function public.can_write_workspace(uuid) to authenticated;

-- --- Organisations, membres ------------------------------------------------------

alter policy organizations_select_member on public.organizations
  using (id in (select public.current_user_all_org_ids()));

alter policy members_select_same_org on public.organization_members
  using (
    organization_id in (select public.current_user_org_ids())
    or user_id = auth.uid()
  );

-- --- Espaces : modification et suppression réservées aux membres --------------

alter policy workspaces_update_member on public.workspaces
  using (
    id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  )
  with check (organization_id in (select public.current_user_org_ids()));

alter policy workspaces_delete_member on public.workspaces
  using (
    id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

-- --- Fichiers et dossiers : lecture = accès, écriture = droit d'écriture ------

alter policy documents_insert_member on public.documents
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and created_by = auth.uid()
  );

alter policy documents_update_member on public.documents
  using (workspace_id in (select public.writable_workspace_ids()))
  with check (workspace_id in (select public.writable_workspace_ids()));

alter policy documents_delete_member on public.documents
  using (workspace_id in (select public.writable_workspace_ids()));

alter policy folders_insert_member on public.folders
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and created_by = auth.uid()
  );

alter policy folders_update_member on public.folders
  using (workspace_id in (select public.writable_workspace_ids()))
  with check (workspace_id in (select public.writable_workspace_ids()));

alter policy folders_delete_member on public.folders
  using (workspace_id in (select public.writable_workspace_ids()));

-- --- Portail client, pièces demandées, décisions : membres uniquement ---------

alter policy share_links_select_member on public.share_links
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

alter policy share_links_insert_member on public.share_links
  with check (
    workspace_id in (select public.writable_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

alter policy share_links_update_member on public.share_links
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  )
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

alter policy share_links_delete_member on public.share_links
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

alter policy document_requests_select_member on public.document_requests
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

alter policy document_requests_insert_member on public.document_requests
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

alter policy document_requests_update_member on public.document_requests
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  )
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

alter policy document_requests_delete_member on public.document_requests
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

-- Décisions et notifications : l'espace doit en plus être accessible (un espace
-- interne fermé ne fuit plus par ses notifications).
alter policy document_decisions_select_member on public.document_decisions
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

alter policy notifications_select_member on public.notifications
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

alter policy notifications_update_member on public.notifications
  using (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  )
  with check (
    workspace_id in (select public.accessible_workspace_ids())
    and organization_id in (select public.current_user_org_ids())
  );

-- --- Accès aux espaces ----------------------------------------------------------
-- Un invité lit ses propres autorisations. Un membre qui peut écrire dans un
-- espace gère les invités de cet espace (les admins gèrent tout, policy
-- existante workspace_access_write_admin).

alter policy workspace_access_select_member on public.workspace_access
  using (
    organization_id in (select public.current_user_org_ids())
    or user_id = auth.uid()
  );

create policy workspace_access_guest_write on public.workspace_access
  for all to authenticated
  using (
    user_id is not null
    and public.is_org_guest(organization_id, user_id)
    and organization_id in (select public.current_user_org_ids())
    and workspace_id in (select public.writable_workspace_ids())
  )
  with check (
    user_id is not null
    and public.is_org_guest(organization_id, user_id)
    and organization_id in (select public.current_user_org_ids())
    and workspace_id in (select public.writable_workspace_ids())
  );

-- --- Invitations de personnes extérieures ---------------------------------------
-- Tout membre peut inviter dans les espaces où il écrit (les invitations
-- d'équipe restent réservées aux admins).

create policy invites_insert_guest on public.organization_invites
  for insert to authenticated
  with check (
    role = 'guest'
    and invited_by = auth.uid()
    and organization_id in (select public.current_user_org_ids())
    and cardinality(workspace_ids) > 0
    and workspace_ids <@ array(select public.writable_workspace_ids())
  );

create policy invites_select_guest on public.organization_invites
  for select to authenticated
  using (
    role = 'guest'
    and organization_id in (select public.current_user_org_ids())
    and workspace_ids && array(select public.accessible_workspace_ids())
  );

create policy invites_manage_guest on public.organization_invites
  for all to authenticated
  using (
    role = 'guest'
    and organization_id in (select public.current_user_org_ids())
    and workspace_ids <@ array(select public.writable_workspace_ids())
  )
  with check (
    role = 'guest'
    and invited_by = auth.uid()
    and organization_id in (select public.current_user_org_ids())
    and cardinality(workspace_ids) > 0
    and workspace_ids <@ array(select public.writable_workspace_ids())
  );

-- Acceptation : un invité reçoit le rôle « guest » et ses accès par espace.
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

  if inv.role = 'guest' then
    insert into public.workspace_access (organization_id, workspace_id, user_id, access_level)
    select inv.organization_id, w.id, auth.uid(), inv.access_level
    from public.workspaces w
    where w.id = any(inv.workspace_ids)
      and w.organization_id = inv.organization_id
    on conflict (workspace_id, user_id) where user_id is not null
    do update set access_level = excluded.access_level;
  end if;

  update public.organization_invites
    set accepted_at = now()
    where id = inv.id;

  return inv.organization_id;
end;
$$;

-- --- Stockage cloisonné par espace ----------------------------------------------
-- Chemins : organizations/{org}/workspaces/{espace}/...

alter policy documents_storage_select on storage.objects
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[4] in (
      select w::text from public.accessible_workspace_ids() as w
    )
  );

alter policy documents_storage_insert on storage.objects
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[4] in (
      select w::text from public.writable_workspace_ids() as w
    )
  );

alter policy documents_storage_delete on storage.objects
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and (storage.foldername(name))[3] = 'workspaces'
    and (storage.foldername(name))[4] in (
      select w::text from public.writable_workspace_ids() as w
    )
  );
