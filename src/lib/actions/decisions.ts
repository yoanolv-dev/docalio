"use server";

import { createClient } from "@/lib/supabase/server";
import type { DecisionType } from "@/lib/types/database";

export type DecisionResult =
  | { ok: true; decision: DecisionType; comment: string | null }
  | { ok: false; message: string };

/**
 * Enregistre la décision d'un client depuis le portail public.
 * La RPC SECURITY DEFINER valide le token et la visibilité du document ;
 * rien n'est écrit si le lien est invalide/expiré ou le document non visible.
 */
export async function submitDecisionAction(
  token: string,
  documentId: string,
  decision: DecisionType,
  comment?: string,
  visitorId?: string
): Promise<DecisionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_document_decision", {
    p_token: token,
    p_document_id: documentId,
    p_decision: decision,
    p_comment: comment ?? null,
    p_visitor_id: visitorId ?? null,
  });

  if (error || !data) {
    return { ok: false, message: "Décision non enregistrée. Veuillez réessayer." };
  }

  return {
    ok: true,
    decision,
    comment: (comment ?? "").trim() || null,
  };
}
