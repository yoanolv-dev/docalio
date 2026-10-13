import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMembership, isAdmin } from "@/lib/organizations";
import { listAuditEvents } from "@/lib/audit";
import { activityAction, activityActor } from "@/lib/activity-labels";

/**
 * Export CSV du journal d'activité (administrateurs). Mêmes filtres que la
 * page, 10 000 lignes au plus. Lecture sous RLS.
 */
export async function GET(request: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership || !isAdmin(membership)) {
    return NextResponse.json({ error: "Réservé aux administrateurs" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const events = await listAuditEvents(
    membership.organization.id,
    {
      workspaceId: sp.get("espace"),
      actorId: sp.get("personne"),
      family: sp.get("type"),
      days: sp.get("periode") ? Number(sp.get("periode")) || null : null,
    },
    10_000
  );

  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    ["Date", "Heure", "Espace", "Auteur", "Action", "Type", "Visiteur"].join(";"),
    ...events.map((e) => {
      const d = new Date(e.created_at);
      return [
        d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
        d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" }),
        e.workspace_name,
        activityActor(e.event_type, e.actor_name),
        activityAction(e.event_type, e.metadata),
        e.event_type,
        e.visitor_id ?? "",
      ]
        .map(cell)
        .join(";");
    }),
  ];

  const date = new Date().toISOString().slice(0, 10);
  // BOM UTF-8 : Excel affiche correctement les accents.
  return new NextResponse(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-docalio-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
