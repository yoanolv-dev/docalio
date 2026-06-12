-- =============================================================================
-- Docalio — Sprint 10 — Notifications internes
--
-- Notifications strictement liées à l'organisation. Créées EXCLUSIVEMENT côté
-- serveur par les RPC SECURITY DEFINER du portail (jamais par le client). Le
-- wording est rendu côté code (src/lib/notifications.ts) : on ne stocke que le
-- `type` + un `metadata` jsonb minimal → changer un texte ne touche pas la base.
--
-- Architecture prête pour l'email plus tard (on pourra ajouter une colonne
-- emailed_at + un worker), mais AUCUN email/service tiers n'est intégré ici.
-- =============================================================================

create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  workspace_id     uuid not null,
  type             text not null
                   check (type in (
                     'portal_opened',
                     'document_downloaded',
                     'document_opened',
                     'decision_received'
                   )),
  metadata         jsonb not null default '{}'::jsonb,
  read_at          timestamptz,
  created_at       timestamptz not null default now(),
  -- Cohérence org/workspace garantie au niveau base (comme activity_events).
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

create index if not exists notifications_org_created_idx
  on public.notifications (organization_id, created_at desc);
-- Accélère le calcul du nombre de non-lues.
create index if not exists notifications_org_unread_idx
  on public.notifications (organization_id)
  where read_at is null;

-- -----------------------------------------------------------------------------
-- RLS : un membre lit/màj uniquement les notifications de son organisation.
-- Aucune policy insert/delete : insertion via RPC SECURITY DEFINER ci-dessous,
-- suppression non exposée. La mise à jour ne sert qu'à marquer « lu ».
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists notifications_select_member on public.notifications;
create policy notifications_select_member on public.notifications
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists notifications_update_member on public.notifications;
create policy notifications_update_member on public.notifications
  for update to authenticated
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

-- -----------------------------------------------------------------------------
-- Helper interne : crée une notification. SECURITY DEFINER → contourne la RLS
-- (insertion légitime depuis les RPC du portail). search_path fixé.
-- -----------------------------------------------------------------------------
create or replace function public.create_notification(
  p_org       uuid,
  p_workspace uuid,
  p_type      text,
  p_metadata  jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (organization_id, workspace_id, type, metadata)
  values (p_org, p_workspace, p_type, coalesce(p_metadata, '{}'::jsonb));
$$;

-- Réservé à un usage interne (appelée par d'autres fonctions definer).
revoke all on function public.create_notification(uuid, uuid, text, jsonb)
  from public, anon, authenticated;

-- =============================================================================
-- Extension des RPC existantes : on AJOUTE la génération de notifications.
-- La logique métier d'origine est conservée à l'identique (signatures, grants).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- record_portal_event : + notification (portal_opened / download / opened).
-- Anti-spam : on ne crée pas de notification si une notification équivalente
-- existe déjà dans une courte fenêtre récente.
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
  v_link      public.share_links;
  v_doc_title text;
begin
  if p_event_type not in ('portal_opened', 'document_downloaded', 'document_opened') then
    return;
  end if;

  select * into v_link
  from public.share_links
  where token = p_token
    and is_active
    and (expires_at is null or expires_at > now());
  if not found then
    return;
  end if;

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

  -- --- Notification interne (anti-spam par fenêtre récente) ----------------
  if p_event_type = 'portal_opened' then
    if not exists (
      select 1 from public.notifications n
      where n.workspace_id = v_link.workspace_id
        and n.type = 'portal_opened'
        and n.created_at > now() - interval '4 hours'
    ) then
      perform public.create_notification(
        v_link.organization_id, v_link.workspace_id, 'portal_opened'
      );
    end if;

  elsif p_event_type in ('document_downloaded', 'document_opened') then
    -- Déduplication par document sur une courte fenêtre.
    if not exists (
      select 1 from public.notifications n
      where n.workspace_id = v_link.workspace_id
        and n.type = p_event_type
        and (n.metadata ->> 'document_id') = p_document_id::text
        and n.created_at > now() - interval '1 hour'
    ) then
      select title into v_doc_title
      from public.documents where id = p_document_id;

      perform public.create_notification(
        v_link.organization_id, v_link.workspace_id, p_event_type,
        jsonb_build_object(
          'document_id', p_document_id,
          'document_title', v_doc_title
        )
      );
    end if;
  end if;
end;
$$;

revoke all on function public.record_portal_event(text, text, uuid, text) from public;
grant execute on function public.record_portal_event(text, text, uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- submit_document_decision : + notification 'decision_received'.
-- Pas de throttle : une décision est une action client délibérée et signifiante
-- (un éventuel commentaire est porté par la même notification).
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
  v_link      public.share_links;
  v_comment   text;
  v_doc_title text;
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

  -- --- Notification interne ------------------------------------------------
  select title into v_doc_title
  from public.documents where id = p_document_id;

  perform public.create_notification(
    v_link.organization_id, v_link.workspace_id, 'decision_received',
    jsonb_build_object(
      'document_id', p_document_id,
      'document_title', v_doc_title,
      'decision', p_decision,
      -- Extrait de commentaire pour l'aperçu (le commentaire complet reste
      -- lisible via la table document_decisions, déjà protégée par RLS).
      'comment', nullif(left(coalesce(v_comment, ''), 280), '')
    )
  );

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
