-- Durcissement (conseiller de sécurité Supabase) : search_path figé pour la
-- fonction de trigger set_updated_at.
alter function public.set_updated_at() set search_path = public;
