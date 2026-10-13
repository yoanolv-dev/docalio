import Link from "next/link";
import { Archive, ArrowRight, Building2, Clock, Lock, Plus } from "lucide-react";
import { ActionList } from "@/components/home/action-list";
import { ItemIcon } from "@/components/drive/item-icon";
import { locatedFileHref as fileHref } from "@/components/drive/file-list";
import { SpaceDot } from "@/components/layout/app-shell";
import { QuickCreateDialog } from "@/components/spaces/quick-create-dialog";
import { formatBytes } from "@/lib/files";
import { formatRelativeTime } from "@/lib/utils";
import type { ActionItem } from "@/lib/action-items";
import type { LocatedFile, SpaceCard } from "@/lib/drive";


/** Accueil du Drive : à traiter, espaces, fichiers récents. */
export function DriveHome({
  firstName,
  guest,
  spaces,
  recent,
  actions,
  newSpace,
  openCreate,
}: {
  firstName: string | null;
  guest: boolean;
  spaces: SpaceCard[];
  recent: LocatedFile[];
  actions: ActionItem[];
  newSpace: { template: string[]; nameExample: string; clientByDefault: boolean };
  openCreate: boolean;
}) {
  const active = spaces.filter((s) => s.status !== "archived");
  const archived = spaces.filter((s) => s.status === "archived");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Bonjour ${firstName}` : "Bonjour"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {guest
            ? "Les espaces que l'on a partagés avec vous."
            : "Tous les espaces et fichiers de votre organisation, au même endroit."}
        </p>
      </div>

      {!guest && actions.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white">
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">À traiter</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{actions.length}</span>
          </header>
          <ActionList items={actions} />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{guest ? "Espaces partagés" : "Espaces"}</h2>
          <span className="text-xs text-muted-foreground">{active.length}</span>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard/workspaces/${s.id}`}
                className="group flex h-full items-center gap-3.5 rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/5"
              >
                <SpaceDot space={s} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    <span className="truncate">{s.name}</span>
                    {s.space_type === "internal" && !guest && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    {s.space_type === "external" && (s.client_email || s.client_company) && !guest && (
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.files} fichier{s.files > 1 ? "s" : ""} · {formatBytes(s.bytes)}
                    {s.lastFileAt ? ` · ${formatRelativeTime(s.lastFileAt).replace(/^I/, "i")}` : ""}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            </li>
          ))}
          {!guest && (
            <li>
              <QuickCreateDialog
                defaultOpen={openCreate}
                template={newSpace.template}
                nameExample={newSpace.nameExample}
                clientByDefault={newSpace.clientByDefault}
                trigger={
                  <button
                    type="button"
                    className="flex h-full min-h-[76px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-subtle/40 hover:text-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Nouvel espace
                  </button>
                }
              />
            </li>
          )}
        </ul>
        {guest && active.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            Aucun espace n&apos;est encore partagé avec vous.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Fichiers récents</h2>
          {recent.length > 0 && (
            <Link href="/dashboard/recents" className="text-xs font-medium text-primary hover:underline">
              Tout voir
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Les derniers fichiers ajoutés ou modifiés apparaîtront ici.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
            {recent.map((f) => (
              <li key={f.id}>
                <Link href={fileHref(f)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
                  <ItemIcon kind="file" name={f.name} mime={f.file_type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[f.workspace_name, f.location].filter(Boolean).join(" › ")}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{formatRelativeTime(f.file_updated_at)}</span>
                  <span className="hidden w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground md:block">{formatBytes(f.file_size)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <details className="group rounded-2xl border border-border bg-white">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
            <Archive className="h-4 w-4" />
            Espaces archivés ({archived.length})
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {archived.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/workspaces/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-slate-50">
                  <SpaceDot space={s} />
                  <span className="truncate">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
