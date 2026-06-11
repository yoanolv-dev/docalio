-- =============================================================================
-- Docalio — Sprint 7 — Tracking client v1 (activity_events)
-- Évènements du portail : portal_opened, document_downloaded (+ document_opened).
-- Insertion uniquement via RPC SECURITY DEFINER après validation du token.
-- RGPD : aucune IP, aucune donnée personnelle ; visitor_id anonyme aléatoire.
-- =============================================================================

create table if not exists public.activity_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  document_id      uuid references public.documents (id) on delete set null,
  share_link_id    uuid references public.share_links (id) on delete set null,
  event_type       text not null
                   check (event_type in ('portal_opened', 'document_downloaded', 'document_opened')),
  visitor_id       text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  -- Cohérence org/workspace garantie au niveau base
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

create index if not exists activity_events_workspace_created_idx
  on public.activity_events (workspace_id, created_at desc);
create index if not exists activity_events_organization_id_idx
  on public.activity_events (organization_id);
create index if not exists activity_events_document_id_idx
  on public.activity_events (document_id);

-- -----------------------------------------------------------------------------
-- RLS : un membre lit uniquement les évènements de son organisation.
-- Pas de policy insert/update/delete : les évènements sont immuables et créés
-- exclusivement par la RPC SECURITY DEFINER ci-dessous.
-- -----------------------------------------------------------------------------
alter table public.activity_events enable row level security;

drop policy if exists activity_events_select_member on public.activity_events;
create policy activity_events_select_member on public.activity_events
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

-- -----------------------------------------------------------------------------
-- RPC publique : enregistre un évènement de portail après validation du token.
-- Accessible anon. Ne fait rien (et ne révèle rien) si le token est invalide.
-- -----------------------------------------------------------------------------
create or replace function public.record_portal_event(
  p_token       text,
  p_event_type  text,
  p_document_id uuid default null,
  p_visitor_id  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links;
begin
  -- Liste blanche des évènements acceptés
  if p_event_type not in ('portal_opened', 'document_downloaded', 'document_opened') then
    return;
  end if;

  -- Token valide, actif, non expiré
  select * into v_link
  from public.share_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now());
  if not found then
    return;
  end if;

  -- Si un document est fourni, il doit appartenir au workspace du lien
  -- et être visible client (jamais de tracking sur un document caché).
  if p_document_id is not null then
    if not exists (
      select 1 from public.documents d
      where d.id = p_document_id
        and d.workspace_id = v_link.workspace_id
        and d.is_visible_to_client
    ) then
      return;
    end if;
  end if;

  insert into public.activity_events (
    organization_id, workspace_id, document_id, share_link_id,
    event_type, visitor_id
  )
  values (
    v_link.organization_id,
    v_link.workspace_id,
    p_document_id,
    v_link.id,
    p_event_type,
    nullif(left(coalesce(p_visitor_id, ''), 64), '')
  );
end;
$$;

revoke all on function public.record_portal_event(text, text, uuid, text) from public;
grant execute on function public.record_portal_event(text, text, uuid, text) to anon, authenticated;
