import type { Metadata } from "next";
import { LinkView } from "@/components/link/link-view";

export const metadata: Metadata = {
  title: "Fichiers partagés",
  robots: { index: false, follow: false },
};

/**
 * Page publique d'un lien de partage du Drive (/l/{token}) : un fichier, un
 * dossier ou un espace entier, sans compte. Tout passe par des RPC publiques
 * validées par le token (+ session si mot de passe) — rendu côté client car
 * la session de déverrouillage vit dans le navigateur.
 */
export default async function DriveLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <LinkView token={token} />;
}
