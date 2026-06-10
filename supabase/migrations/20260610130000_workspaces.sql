-- =============================================================================
-- Docalio — Sprint 4 — Module Workspaces (espaces clients / projets)
-- =============================================================================

create table if not exists public.workspaces (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  client_company   text,
  client_email     text,
  client_phone     text,
  status           text not null default 'prospect'
                   check (status in ('prospect', 'active', 'archived')),
  internal_note    text,
  logo_url         text,
  primary_color    text,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists workspaces_organization_id_idx on public.workspaces (organization_id);
create index if not exists workspaces_status_idx on public.workspaces (status);

-- updated_at automatique (réutilise la fonction du Sprint 2)
drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS : isolation stricte par organisation
--   current_user_org_ids() est SECURITY DEFINER (défini au Sprint 2) → pas de
--   récursion. Aucun accès inter-organisation possible.
-- -----------------------------------------------------------------------------
alter table public.workspaces enable row level security;

drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists workspaces_insert_member on public.workspaces;
create policy workspaces_insert_member on public.workspaces
  for insert to authenticated
  with check (
    organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

drop policy if exists workspaces_update_member on public.workspaces;
create policy workspaces_update_member on public.workspaces
  for update to authenticated
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists workspaces_delete_member on public.workspaces;
create policy workspaces_delete_member on public.workspaces
  for delete to authenticated
  using (organization_id in (select public.current_user_org_ids()));
