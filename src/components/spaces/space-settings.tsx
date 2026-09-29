"use client";

import type { ReactNode } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Tout ce qui est occasionnel (infos client, options du lien, accès,
 * archivage, suppression) vit ici, hors de la vue principale.
 */
export function SpaceSettings({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-xl bg-white">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Paramètres</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88dvh] max-w-xl gap-0 overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
          <DialogTitle>Paramètres</DialogTitle>
          <DialogDescription className="mt-0.5 truncate">{title}</DialogDescription>
        </div>
        <div className="divide-y divide-border">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="px-6 py-5">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}
