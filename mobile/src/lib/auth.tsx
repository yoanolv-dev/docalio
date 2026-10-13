import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

// État de connexion : la 2FA est exigée dès qu'un facteur vérifié existe et
// que la session n'a pas encore le niveau « aal2 » (même règle que le site).

export type AuthStatus = "loading" | "signedOut" | "mfa" | "signedIn";

interface AuthValue {
  status: AuthStatus;
  session: Session | null;
  /** Niveau d'assurance de la session (aal1 : mot de passe, aal2 : + code). */
  aal: "aal1" | "aal2";
  signOut: () => Promise<void>;
  /** Relit la session (après vérification d'un code 2FA). */
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

function jwtClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    // Les caractères non ASCII deviennent illisibles, mais le JSON reste valide (seul « aal » nous intéresse).
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function evaluate(session: Session | null): { status: AuthStatus; aal: "aal1" | "aal2" } {
  if (!session) return { status: "signedOut", aal: "aal1" };
  const aal = jwtClaims(session.access_token).aal === "aal2" ? "aal2" : "aal1";
  const hasFactor = (session.user.factors ?? []).some((f) => f.status === "verified");
  return { status: hasFactor && aal !== "aal2" ? "mfa" : "signedIn", aal };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<{ status: AuthStatus; aal: "aal1" | "aal2" }>({ status: "loading", aal: "aal1" });

  const apply = useCallback((s: Session | null) => {
    setSession(s);
    setState(evaluate(s));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    // Pas d'appel Supabase dans ce rappel (verrou interne) : décodage local du jeton.
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      apply(s);
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [apply, queryClient]);

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.refreshSession();
    apply(data.session);
  }, [apply]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ status: state.status, aal: state.aal, session, signOut, reload }),
    [state, session, signOut, reload],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hors de AuthProvider");
  return ctx;
}
