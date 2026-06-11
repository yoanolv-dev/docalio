"use client";

import { useEffect, useRef } from "react";
import { recordPortalEventAction } from "@/lib/actions/share-links";
import { getVisitorId } from "@/lib/visitor";

/**
 * Enregistre une ouverture du portail (portal_opened) une seule fois au montage.
 * Aucun rendu. Le token est déjà validé côté serveur ; la RPC revalide.
 */
export function PortalTracker({ token }: { token: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void recordPortalEventAction(token, "portal_opened", undefined, getVisitorId());
  }, [token]);

  return null;
}
