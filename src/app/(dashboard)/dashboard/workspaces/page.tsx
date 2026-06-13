import { redirect } from "next/navigation";

// La liste des espaces vit désormais sur l'accueil du dashboard.
// On conserve la route pour les anciens liens et on redirige.
export default function WorkspacesPage() {
  redirect("/dashboard");
}
