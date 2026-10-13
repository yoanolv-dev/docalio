import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getCurrentMembership } from "@/lib/organizations";
import { searchDrive } from "@/lib/drive";
import { LocatedFileList } from "@/components/drive/file-list";
import { ItemIcon } from "@/components/drive/item-icon";

export const metadata: Metadata = { title: "Recherche" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const results = await searchDrive(membership.organization.id, q, 100);
  const total = results.spaces.length + results.folders.length + results.files.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recherche</h1>
        <form action="/dashboard/recherche" className="mt-3 flex max-w-xl items-center gap-2 rounded-xl border border-border bg-white px-3 focus-within:ring-[3px] focus-within:ring-ring/20">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            autoFocus={!q}
            placeholder="Nom d'un fichier, d'un dossier, d'un espace…"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </form>
        {results.query.length >= 2 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {total === 0 ? "Aucun résultat" : `${total} résultat${total > 1 ? "s" : ""}`} pour « {results.query} »
          </p>
        )}
      </div>

      {(results.spaces.length > 0 || results.folders.length > 0) && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Espaces et dossiers</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
            {results.spaces.map((s) => (
              <li key={s.id}>
                <Link href={`/dashboard/workspaces/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <ItemIcon kind="folder" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Espace</p>
                  </div>
                </Link>
              </li>
            ))}
            {results.folders.map((f) => (
              <li key={f.id}>
                <Link href={`/dashboard/workspaces/${f.workspace_id}?dossier=${f.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <ItemIcon kind="folder" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{[f.workspace_name, f.location].filter(Boolean).join(" › ")}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.files.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Fichiers</h2>
          <LocatedFileList files={results.files} />
        </section>
      )}
    </div>
  );
}
