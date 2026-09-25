"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface WorkspaceTab {
  id: string;
  label: string;
  /** Icône déjà rendue (un composant ne peut pas traverser la frontière client). */
  icon: ReactNode;
  /** Pastille (ex. pièces à traiter). Masquée si 0/absente. */
  count?: number;
  /** Pastille mise en avant (action requise). */
  alert?: boolean;
  content: ReactNode;
}

/**
 * Onglets pleine largeur du détail d'espace. L'onglet actif est reflété dans
 * l'URL (?tab=) sans navigation serveur : lien partageable, retour arrière et
 * rechargement conservent la vue.
 */
export function WorkspaceTabs({
  tabs,
  initialTab,
}: {
  tabs: WorkspaceTab[];
  initialTab: string;
}) {
  const resolve = (id: string) => (tabs.some((t) => t.id === id) ? id : tabs[0].id);
  const [active, setActive] = useState(resolve(initialTab));
  // Un lien interne « ?tab=… » (navigation douce) resynchronise l'onglet.
  const [lastInitial, setLastInitial] = useState(initialTab);
  if (lastInitial !== initialTab) {
    setLastInitial(initialTab);
    setActive(resolve(initialTab));
  }

  function select(id: string) {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Sections de l'espace"
        className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:w-fit"
      >
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              onClick={() => select(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                on
                  ? "bg-primary-subtle text-primary"
                  : "text-muted-foreground hover:bg-canvas hover:text-foreground"
              )}
            >
              <span className="[&>svg]:h-4 [&>svg]:w-4">{t.icon}</span>
              {t.label}
              {!!t.count && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
                    t.alert ? "bg-primary text-primary-foreground" : on ? "bg-white text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          className="animate-fade-up"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
