import { redirect } from "next/navigation";

// La création d'un espace se fait dans une fenêtre, depuis le Drive.
export default function NewWorkspacePage() {
  redirect("/dashboard?nouveau=1");
}
