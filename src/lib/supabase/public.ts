import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase strictement anonyme (aucun cookie, aucune session) pour les
 * pages publiques : liens de partage et portail. Un visiteur connecté à une
 * autre organisation reste ainsi un visiteur anonyme, soumis aux mêmes RPC
 * contrôlées par jeton et aux mêmes policies Storage.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
}
