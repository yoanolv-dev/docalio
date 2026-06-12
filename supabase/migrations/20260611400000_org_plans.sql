-- =============================================================================
-- Docalio — Sprint 9 — Plans, quotas & limites (sans Stripe)
-- Le plan d'une organisation est stocké sur la table organizations.
-- Les définitions/limites des plans vivent dans le code (src/lib/plans.ts).
-- Architecture compatible Stripe plus tard (on ajoutera stripe_* ultérieurement).
-- =============================================================================

alter table public.organizations
  add column if not exists plan text not null default 'pro'
    check (plan in ('starter', 'pro', 'business', 'enterprise')),
  add column if not exists plan_status text not null default 'trial'
    check (plan_status in ('trial', 'active', 'suspended')),
  add column if not exists trial_ends_at timestamptz default (now() + interval '14 days');

-- Aucune nouvelle policy : organizations est déjà protégée par RLS
-- (lecture membres, écriture owner/admin). Le changement de plan se fera
-- plus tard via la facturation (service serveur), pas via l'UI cliente.
