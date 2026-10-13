import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/organizations";
import { listOrgLinks } from "@/lib/links";
import { LinksView } from "@/components/drive/links-view";

export const metadata: Metadata = { title: "Liens de partage" };

export default async function LinksPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  if (membership.role === "guest") redirect("/dashboard");

  const links = await listOrgLinks(membership.organization.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Liens de partage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tous les liens actifs vers vos fichiers et dossiers. Révoquez-en un : il cesse aussitôt de fonctionner.
        </p>
      </div>
      <LinksView links={links} />
    </div>
  );
}
