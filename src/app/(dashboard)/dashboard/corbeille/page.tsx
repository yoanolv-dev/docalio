import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/organizations";
import { listTrash } from "@/lib/drive";
import { purgeExpiredTrash } from "@/lib/actions/drive";
import { TrashView } from "@/components/drive/trash-view";

export const metadata: Metadata = { title: "Corbeille" };

export default async function TrashPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  // Les éléments restés plus de 30 jours partent définitivement.
  await purgeExpiredTrash(membership.organization.id);
  const items = await listTrash(membership.organization.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Corbeille</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Restaurez un fichier ou un dossier supprimé, avec tout son contenu, à son emplacement d&apos;origine.
        </p>
      </div>
      <TrashView items={items} />
    </div>
  );
}
