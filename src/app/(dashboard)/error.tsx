"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Trace côté serveur de logs uniquement ; rien d'exposé à l'utilisateur.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-lg font-semibold">Une erreur est survenue</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Quelque chose s&apos;est mal passé de notre côté. Réessayez dans un
        instant.
      </p>
      <Button onClick={reset} className="mt-5">
        <RotateCcw className="h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}
