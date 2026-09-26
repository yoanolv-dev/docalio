import { redirect } from "next/navigation";

// La liste des espaces est la page d'accueil de l'application.
export default function WorkspacesPage() {
  redirect("/dashboard");
}
