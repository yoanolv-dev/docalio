import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { getCurrentMembership } from "@/lib/organizations";
import { getPeopleNames, listRecentFiles } from "@/lib/drive";
import { LocatedFileList } from "@/components/drive/file-list";

export const metadata: Metadata = { title: "Récents" };

export default async function RecentsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const files = await listRecentFiles(membership.organization.id, 60);
  const people = await getPeopleNames(files.map((f) => f.file_updated_by));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Récents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Les derniers fichiers ajoutés ou modifiés, tous espaces confondus.</p>
      </div>
      {files.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-semibold">Rien de récent</p>
          <p className="mt-1 text-sm text-muted-foreground">Importez des fichiers dans un espace : ils apparaîtront ici.</p>
        </div>
      ) : (
        <LocatedFileList files={files} people={people} />
      )}
    </div>
  );
}
