import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { secureStorage } from "./secure-storage";
import { supabase } from "./supabase";
import type { Organization, OrganizationRole } from "./shared";

// Organisation active (membre ou invité de plusieurs) : même règle que le site
// (choix mémorisé, sinon la première où l'on est membre, sinon invité).

export interface Membership {
  organization: Organization;
  role: OrganizationRole;
}

interface OrgValue {
  loading: boolean;
  memberships: Membership[];
  active: Membership | null;
  isGuest: boolean;
  isAdmin: boolean;
  /** L'organisation exige la 2FA et la session ne l'a pas encore. */
  mfaRequired: boolean;
  switchTo: (organizationId: string) => Promise<void>;
}

const STORE_KEY = "docalio.active-org";
const OrgContext = createContext<OrgValue | null>(null);

async function fetchMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, created_at, organizations(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as { role: string; organizations: unknown }[])
    .filter((r) => r.organizations)
    .map((r) => ({
      role: r.role as OrganizationRole,
      organization: (Array.isArray(r.organizations) ? r.organizations[0] : r.organizations) as Organization,
    }));
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { session, aal } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? null;
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    secureStorage.getItem(STORE_KEY).then((v) => setChosen(v));
  }, []);

  const query = useQuery({
    queryKey: ["memberships", userId],
    queryFn: () => fetchMemberships(userId!),
    enabled: Boolean(userId),
  });

  const memberships = useMemo(() => query.data ?? [], [query.data]);
  const active =
    memberships.find((m) => m.organization.id === chosen) ??
    memberships.find((m) => m.role !== "guest") ??
    memberships[0] ??
    null;

  const switchTo = useCallback(
    async (organizationId: string) => {
      await secureStorage.setItem(STORE_KEY, organizationId);
      setChosen(organizationId);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "memberships" });
    },
    [queryClient],
  );

  const value = useMemo<OrgValue>(
    () => ({
      loading: chosen === undefined || query.isPending,
      memberships,
      active,
      isGuest: active?.role === "guest",
      isAdmin: active?.role === "owner" || active?.role === "admin",
      mfaRequired: Boolean(active?.organization.require_mfa) && aal !== "aal2",
      switchTo,
    }),
    [chosen, query.isPending, memberships, active, aal, switchTo],
  );
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrganization(): OrgValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrganization hors de OrganizationProvider");
  return ctx;
}

/** Organisation active (écrans connectés uniquement). */
export function useActiveOrg(): Membership {
  const { active } = useOrganization();
  if (!active) throw new Error("Aucune organisation active");
  return active;
}
