"use client";

import { useState } from "react";
import Image from "next/image";
import { FolderTree, Inbox, LayoutGrid, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "portail",
    label: "Portail client",
    icon: MonitorSmartphone,
    title: "Un portail à votre marque, sans compte à créer.",
    text: "Votre client voit ce qu'il doit déposer, consulter et valider. Rien de plus, rien de moins.",
    src: "/product/portal.png",
    w: 1720,
    h: 3408,
  },
  {
    id: "collecte",
    label: "Collecte de pièces",
    icon: Inbox,
    title: "Demandez. Le client dépose. Vous validez.",
    text: "Chaque pièce a une échéance et un statut. Les retards sautent aux yeux, l'activité du client s'affiche en direct.",
    src: "/product/collecte.png",
    w: 2360,
    h: 1800,
  },
  {
    id: "espaces",
    label: "Tableau de bord",
    icon: LayoutGrid,
    title: "Tous vos clients, et ce qui les bloque.",
    text: "Décisions en attente, pièces manquantes, dernière activité : vous savez qui relancer d'un coup d'œil.",
    src: "/product/dashboard.png",
    w: 2480,
    h: 1800,
  },
  {
    id: "drive",
    label: "Espace documentaire",
    icon: FolderTree,
    title: "Vos dossiers, rangés comme sur votre ordinateur.",
    text: "Glisser-déposer, arborescence, visibilité client document par document.",
    src: "/product/drive.png",
    w: 2480,
    h: 1848,
  },
] as const;

export function ProductShowcase() {
  const [active, setActive] = useState<(typeof TABS)[number]["id"]>("portail");
  const tab = TABS.find((t) => t.id === active)!;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Découvrir le produit"
        className="mx-auto flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 shadow-sm sm:w-fit"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab.id}`}
        aria-labelledby={`tab-${tab.id}`}
        className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_2fr]"
      >
        <div key={tab.id} className="animate-fade-up">
          <h3 className="text-2xl font-semibold tracking-tight">{tab.title}</h3>
          <p className="mt-3 leading-relaxed text-muted-foreground">{tab.text}</p>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(37,99,235,0.18),transparent)] blur-2xl"
          />
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-[0_40px_100px_-40px_rgba(15,23,42,0.45)]">
            {TABS.map((t) => (
              <Image
                key={t.id}
                src={t.src}
                alt={`Capture d'écran Docalio — ${t.label}`}
                width={t.w}
                height={t.h}
                sizes="(min-width: 1024px) 720px, 100vw"
                className={cn(
                  "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-500",
                  t.id === active ? "opacity-100" : "opacity-0"
                )}
                loading={t.id === "portail" ? "eager" : "lazy"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
