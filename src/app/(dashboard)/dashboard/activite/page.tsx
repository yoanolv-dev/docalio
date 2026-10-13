import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Download, FileDown } from "lucide-react";
import { getCurrentMembership, isAdmin } from "@/lib/organizations";
import { listAuditEvents } from "@/lib/audit";
import { listNavSpaces } from "@/lib/drive";
import { listOrgMembers } from "@/lib/team";
import { ACTIVITY_FILTERS, activityAction, activityActor } from "@/lib/activity-labels";
import { formatRelativeTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activité" };

const PERIODS = [
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "90", label: "90 jours" },
  { id: "", label: "Tout" },
];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Aujourd'hui";
  if (same(d, yesterday)) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ espace?: string; personne?: string; type?: string; periode?: string; avant?: string }>;
}) {
  const sp = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  if (membership.role === "guest") redirect("/dashboard");
  const org = membership.organization;

  const filters = {
    workspaceId: sp.espace || null,
    actorId: sp.personne || null,
    family: sp.type || null,
    days: sp.periode ? Number(sp.periode) || null : null,
    before: sp.avant || null,
  };
  const [events, spaces, members] = await Promise.all([
    listAuditEvents(org.id, filters, 80),
    listNavSpaces(org.id),
    listOrgMembers(org.id),
  ]);

  const query = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const merged = { espace: sp.espace, personne: sp.personne, type: sp.type, periode: sp.periode, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  const groups: { day: string; items: typeof events }[] = [];
  for (const e of events) {
    const day = dayLabel(e.created_at);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1)!.items.push(e);
  }

  const selectClass =
    "h-9 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activité</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Qui a ajouté, ouvert, téléchargé, partagé ou supprimé quoi, et quand.
          </p>
        </div>
        {isAdmin(membership) && (
          <a
            href={`/dashboard/activite/export${query({ avant: null })}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-white px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
          >
            <FileDown className="h-4 w-4" />
            Exporter (CSV)
          </a>
        )}
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-3" action="/dashboard/activite">
        <select name="espace" defaultValue={sp.espace ?? ""} className={selectClass} aria-label="Espace">
          <option value="">Tous les espaces</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select name="personne" defaultValue={sp.personne ?? ""} className={selectClass} aria-label="Personne">
          <option value="">Toutes les personnes</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name || m.email}
              {m.role === "guest" ? " (invité)" : ""}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className={selectClass} aria-label="Type">
          <option value="">Toutes les actions</option>
          {ACTIVITY_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select name="periode" defaultValue={sp.periode ?? ""} className={selectClass} aria-label="Période">
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
          Filtrer
        </button>
        {(sp.espace || sp.personne || sp.type || sp.periode) && (
          <Link href="/dashboard/activite" className="px-2 text-sm text-muted-foreground hover:text-foreground">
            Réinitialiser
          </Link>
        )}
      </form>

      {events.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold">Aucune activité</p>
          <p className="mt-1 text-sm text-muted-foreground">Rien ne correspond à ces filtres.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground first-letter:uppercase">{g.day}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
                {g.items.map((e) => {
                  const actor = activityActor(e.event_type, e.actor_name);
                  const external = !e.actor_id;
                  return (
                    <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          external ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {external ? <Download className="h-3.5 w-3.5" /> : actor.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{actor}</span> {activityAction(e.event_type, e.metadata)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Link href={`/dashboard/workspaces/${e.workspace_id}`} className="hover:underline">{e.workspace_name}</Link>
                          {" · "}
                          {new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(e.created_at))}
                          {" · "}
                          {formatRelativeTime(e.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {events.length === 80 && (
            <div className="flex justify-center">
              <Link
                href={`/dashboard/activite${query({ avant: events.at(-1)!.created_at })}`}
                className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Plus ancien
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
