import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-subtle text-primary">
        <FileQuestion className="h-5 w-5" />
      </div>
      <p className="mt-6 text-sm font-semibold text-muted-foreground">
        Erreur 404
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Page introuvable
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}
