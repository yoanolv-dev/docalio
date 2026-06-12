import { createClient } from "@/lib/supabase/server";

/**
 * Progression « première valeur » d'un nouvel utilisateur. Toutes les requêtes
 * sont des comptages (head) restreints par la RLS à l'organisation courante.
 */
export interface OnboardingProgress {
  hasWorkspace: boolean;
  hasDocument: boolean;
  hasPortalLink: boolean;
  hasActivity: boolean;
  hasDecision: boolean;
  /** Workspace le plus récent (pour cibler les CTA des étapes). */
  latestWorkspaceId: string | null;
  completed: number;
  total: number;
  done: boolean;
}

export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const supabase = await createClient();

  const [ws, docs, links, activity, decisions, latest] = await Promise.all([
    supabase.from("workspaces").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("share_links")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("activity_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "portal_opened"),
    supabase
      .from("document_decisions")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("workspaces")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
  ]);

  const hasWorkspace = (ws.count ?? 0) > 0;
  const hasDocument = (docs.count ?? 0) > 0;
  const hasPortalLink = (links.count ?? 0) > 0;
  const hasActivity = (activity.count ?? 0) > 0;
  const hasDecision = (decisions.count ?? 0) > 0;

  const steps = [
    hasWorkspace,
    hasDocument,
    hasPortalLink,
    hasActivity,
    hasDecision,
  ];
  const completed = steps.filter(Boolean).length;

  return {
    hasWorkspace,
    hasDocument,
    hasPortalLink,
    hasActivity,
    hasDecision,
    latestWorkspaceId: latest.data?.id ?? null,
    completed,
    total: steps.length,
    done: completed === steps.length,
  };
}
