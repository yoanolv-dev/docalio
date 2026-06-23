-- =============================================================================
-- Docalio — Consultation sécurisée du portail (« view-only »)
--
-- Problème corrigé : un document « visible au client » mais « non
-- téléchargeable » (allow_download = false) était totalement inaccessible côté
-- portail — aucun bouton, mais une décision demandée. Le toggle « téléchargement »
-- n'avait donc aucun usage utile (il masquait le document au lieu de le passer
-- en lecture seule).
--
-- Nouveau modèle (aligné sur un portail documentaire premium) :
--   - is_visible_to_client = true  → le client peut CONSULTER (aperçu inline).
--   - allow_download       = true  → le client peut EN PLUS télécharger le fichier.
--
-- Sécurité : changement STRICTEMENT ADDITIF. Les policies existantes
-- (download) ne sont pas modifiées. Le bucket reste privé : l'accès passe
-- toujours par une URL signée temporaire (60 s), gouvernée par la RLS Storage.
-- Aucune lecture directe, aucun service_role, aucune fuite inter-organisation
-- (le document doit appartenir au workspace d'un lien actif non expiré).
--
-- Limite assumée (inhérente à toute « consultation seule ») : un document rendu
-- dans le navigateur peut techniquement être capté par un utilisateur averti.
-- allow_download = false signale donc une intention (« document de référence,
-- non destiné à être conservé »), pas une garantie cryptographique.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RPC publique : résout le chemin Storage d'un document pour APERÇU.
-- Renvoie le file_path si le document est visible ET rattaché à un lien actif.
-- N'exige PAS allow_download (différence avec get_portal_document_path).
-- -----------------------------------------------------------------------------
create or replace function public.get_portal_preview_path(
  p_token text,
  p_document_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_path text;
begin
  select d.file_path into v_path
  from public.documents d
  join public.share_links sl on sl.workspace_id = d.workspace_id
  where sl.token = p_token
    and sl.is_active
    and (sl.expires_at is null or sl.expires_at > now())
    and d.id = p_document_id
    and d.is_visible_to_client;

  return v_path; -- NULL si non autorisé
end;
$$;

revoke all on function public.get_portal_preview_path(text, uuid) from public;
grant execute on function public.get_portal_preview_path(text, uuid) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage : autorise le rôle anon à SIGNER (createSignedUrl) les fichiers
-- VISIBLES rattachés à un lien actif non expiré — qu'ils soient téléchargeables
-- ou non. Policy distincte et additive : la policy de download existante
-- (documents_storage_portal_read) reste inchangée.
-- Le bucket reste privé ; seule la signature temporaire donne accès.
-- -----------------------------------------------------------------------------
drop policy if exists documents_storage_portal_preview on storage.objects;
create policy documents_storage_portal_preview on storage.objects
  for select to anon
  using (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.documents d
      join public.share_links sl on sl.workspace_id = d.workspace_id
      where d.file_path = name
        and d.is_visible_to_client
        and sl.is_active
        and (sl.expires_at is null or sl.expires_at > now())
    )
  );
