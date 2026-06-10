-- =============================================================================
-- Docalio — Sprint 5 — Module Documents
-- Table documents + RLS, bucket Storage privé `documents` + policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Intégrité : index unique (id, organization_id) sur workspaces pour permettre
-- une FK composite depuis documents. Garantit au niveau base qu'un document ne
-- peut jamais référencer un workspace d'une autre organisation.
-- -----------------------------------------------------------------------------
create unique index if not exists workspaces_id_organization_id_uidx
  on public.workspaces (id, organization_id);

-- -----------------------------------------------------------------------------
-- Table documents
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  workspace_id          uuid not null,
  title                 text not null,
  description           text,
  category              text,
  file_url              text,
  file_path             text not null,
  file_type             text,
  file_size             bigint,
  status                text not null default 'draft'
                        check (status in ('draft', 'sent', 'viewed', 'downloaded', 'approved', 'rejected', 'archived')),
  allow_download        boolean not null default true,
  is_visible_to_client  boolean not null default true,
  created_by            uuid references public.profiles (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- FK composite : le workspace doit appartenir à la même organisation
  foreign key (workspace_id, organization_id)
    references public.workspaces (id, organization_id) on delete cascade
);

create index if not exists documents_organization_id_idx on public.documents (organization_id);
create index if not exists documents_workspace_id_idx on public.documents (workspace_id);
create index if not exists documents_status_idx on public.documents (status);

-- updated_at automatique (réutilise la fonction du Sprint 2)
drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS table documents : isolation stricte par organisation
-- -----------------------------------------------------------------------------
alter table public.documents enable row level security;

drop policy if exists documents_select_member on public.documents;
create policy documents_select_member on public.documents
  for select to authenticated
  using (organization_id in (select public.current_user_org_ids()));

drop policy if exists documents_insert_member on public.documents;
create policy documents_insert_member on public.documents
  for insert to authenticated
  with check (
    organization_id in (select public.current_user_org_ids())
    and created_by = auth.uid()
  );

drop policy if exists documents_update_member on public.documents;
create policy documents_update_member on public.documents
  for update to authenticated
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

drop policy if exists documents_delete_member on public.documents;
create policy documents_delete_member on public.documents
  for delete to authenticated
  using (organization_id in (select public.current_user_org_ids()));

-- -----------------------------------------------------------------------------
-- Bucket Storage privé `documents`
--   Chemins : organizations/{organization_id}/workspaces/{workspace_id}/{document_id}-{safe_name}
--   Limite de taille appliquée aussi côté Storage (défense en profondeur).
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 20971520) -- 20 Mo
on conflict (id) do update set public = false, file_size_limit = 20971520;

-- -----------------------------------------------------------------------------
-- Policies Storage : accès restreint aux membres de l'organisation du chemin.
--   (storage.foldername(name))[1] = 'organizations'
--   (storage.foldername(name))[2] = organization_id
-- NB : si votre projet refuse la création de policies sur storage.objects en
-- SQL ("must be owner"), créez ces 3 policies équivalentes via
-- Dashboard → Storage → documents → Policies.
-- -----------------------------------------------------------------------------
drop policy if exists documents_storage_select on storage.objects;
create policy documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and ((storage.foldername(name))[2])::uuid in (select public.current_user_org_ids())
  );

drop policy if exists documents_storage_insert on storage.objects;
create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and ((storage.foldername(name))[2])::uuid in (select public.current_user_org_ids())
  );

drop policy if exists documents_storage_delete on storage.objects;
create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'organizations'
    and ((storage.foldername(name))[2])::uuid in (select public.current_user_org_ids())
  );
