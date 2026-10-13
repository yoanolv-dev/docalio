import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { secureStorage } from "./secure-storage";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

// Même projet Supabase que le site : toutes les règles d'accès (RLS, invités,
// 2FA, quotas, journal) sont appliquées par la base, quel que soit l'appareil.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rafraîchissement du jeton uniquement quand l'application est au premier plan.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
