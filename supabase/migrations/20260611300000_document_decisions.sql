-- =============================================================================
-- Docalio — Sprint 8 — Décisions client (validation / refus / modification)
-- Table document_decisions + RLS + RPC publiques SECURITY DEFINER.
-- Une décision courante par document, modifiable. Bucket inchangé.
-- =============================================================================

create table if not exists public.document_decisions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  document_id      uuid not null references public.documents (id) on delete cascade,
  share_link_id    uuid references public.share_links (id) on delete set null,
  decision         text not null
                   check (decision in ('approved', 'rejected', 'changes_requested')),
  comment          text,
  visitor_id       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Une décision courante par document (la dernière fait foi)
  unique (document_id),
  -- Cohérence org/workspace garantie au niveau base
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

create index if not exists document_decisions_workspace_id_idx
  on public.document_decisions (workspace_id);
create index if not exists document_decisions_organization_id_idx
  on public.document_decisions (organization_id);

drop trigger if exists set_document_decisions_updated_at on public.document_decisions;
create trigger set_document_decisions_updated_at
  before update on public.document_decisions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS : lecture réservée aux membres de l'organisation. Aucune écriture directe.
-- -----------------------------------------------------------------------------
alter table public.document_decisions enable row level security;

drop policy if exists document_decisions_select_member on public.document_decisions;
create policy document_decisions_select_member on public.document_decisions
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

-- -----------------------------------------------------------------------------
-- RPC publique : enregistre/met a jour la decision d'un client (anon).
-- Valide le token (actif, non expiré) et que le document appartient au
-- workspace du lien et est visible client. Sinon ne fait rien (NULL).
-- -----------------------------------------------------------------------------
create or replace function public.submit_document_decision(
  p_token       text,
  p_document_id uuid,
  p_decision    text,
  p_comment     text default null,
  p_visitor_id  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link    public.share_links;
  v_comment text;
begin
  if p_decision not in ('approved', 'rejected', 'changes_requested') then
    return null;
  end if;

  select * into v_link
  from public.share_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now());
  if not found then
    return null;
  end if;

  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id
      and d.workspace_id = v_link.workspace_id
      and d.is_visible_to_client
  ) then
    return null;
  end if;

  v_comment := nullif(left(coalesce(p_comment, ''), 2000), '');

  insert into public.document_decisions (
    organization_id, workspace_id, document_id, share_link_id,
    decision, comment, visitor_id
  )
  values (
    v_link.organization_id, v_link.workspace_id, p_document_id, v_link.id,
    p_decision, v_comment, nullif(left(coalesce(p_visitor_id, ''), 64), '')
  )
  on conflict (document_id) do update
    set decision      = excluded.decision,
        comment       = excluded.comment,
        share_link_id = excluded.share_link_id,
        visitor_id    = excluded.visitor_id,
        updated_at    = now();

  return jsonb_build_object(
    'document_id', p_document_id,
    'decision', p_decision,
    'comment', v_comment
  );
end;
$$;

revoke all on function public.submit_document_decision(text, uuid, text, text, text) from public;
grant execute on function public.submit_document_decision(text, uuid, text, text, text)
  to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC publique : décisions courantes du workspace d'un lien (pour le portail).
-- -----------------------------------------------------------------------------
create or replace function public.get_portal_decisions(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_link public.share_links;
  v_res  jsonb;
begin
  select * into v_link
  from public.share_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now());
  if not found then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'document_id', dd.document_id,
        'decision', dd.decision,
        'comment', dd.comment
      )
    ),
    '[]'::jsonb
  )
  into v_res
  from public.document_decisions dd
  where dd.workspace_id = v_link.workspace_id;

  return v_res;
end;
$$;

revoke all on function public.get_portal_decisions(text) from public;
grant execute on function public.get_portal_decisions(text) to anon, authenticated;
