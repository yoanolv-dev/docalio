"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  type?: "item";
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export type ContextMenuEntry = ContextMenuItem | { type: "separator" };

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuEntry[];
}

/**
 * Menu contextuel léger (sans dépendance) : positionné au curseur, recadré
 * dans l'écran, fermé au clic extérieur / Échap / scroll. Sert au clic droit
 * et au bouton « ⋯ » du Drive.
 */
export function ContextMenu({
  state,
  onClose,
}: {
  state: ContextMenuState | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: state?.x ?? 0, y: state?.y ?? 0 });

  // Recadrage dans le viewport une fois la taille connue.
  useLayoutEffect(() => {
    if (!state || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const margin = 8;
    const x = Math.min(state.x, window.innerWidth - width - margin);
    const y = Math.min(state.y, window.innerHeight - height - margin);
    setPos({ x: Math.max(margin, x), y: Math.max(margin, y) });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = () => onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [state, onClose]);

  if (!state) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={ref}
        role="menu"
        className="animate-menu-in fixed z-50 min-w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg shadow-black/[0.08] dark:shadow-black/40"
        style={{ left: pos.x, top: pos.y }}
      >
        {state.items.map((entry, i) => {
          if ("type" in entry && entry.type === "separator") {
            return <div key={`sep-${i}`} className="my-1 h-px bg-border" />;
          }
          const item = entry as ContextMenuItem;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                onClose();
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-40",
                item.destructive
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-foreground hover:bg-accent"
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
