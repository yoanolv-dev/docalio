-- =============================================================================
-- Correctif : création d'espace impossible (« new row violates row-level
-- security policy for table workspaces »).
--
-- La policy SELECT reposait uniquement sur accessible_workspace_ids(), fonction
-- STABLE qui relit la table workspaces : pendant l'INSERT ... RETURNING, elle ne
-- voit pas encore la ligne créée, donc la ligne renvoyée était refusée.
--
-- On évalue en plus les MÊMES règles directement sur la ligne (même
-- organisation ET espace externe / créateur / admin). Les autorisations
-- explicites (workspace_access) restent portées par la fonction.
-- Aucun droit nouveau : strictement la même règle de visibilité.
-- =============================================================================
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces
  for select to authenticated
  using (
    (
      organization_id in (select public.current_user_org_ids())
      and (
        space_type = 'external'
        or created_by = auth.uid()
        or public.is_org_admin(organization_id)
      )
    )
    or id in (select public.accessible_workspace_ids())
  );
