import { ArrowLeft, ArrowRight, Lock, Minus, RotateCw, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cadre « fenêtre » façon navigateur Windows (Edge) : onglet à gauche, contrôles
 * de fenêtre (réduire / agrandir / fermer) à droite, barre d'adresse. Sert aux
 * captures produit et aux aperçus live du site (la cible majoritaire est
 * Windows, pas macOS).
 *
 * `width` fixe est utilisé pour les captures Playwright ; sans `width`, le cadre
 * est fluide (aperçus responsives du site).
 */
export function BrowserFrame({
  url,
  children,
  width,
  className,
}: {
  url: string;
  children: React.ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(15,18,30,0.45)]",
        className
      )}
      style={width ? { width } : undefined}
    >
      {/* Barre de titre + onglet + contrôles fenêtre (Windows) */}
      <div className="flex items-stretch bg-[#e8e8ec]">
        <div className="flex items-end gap-1 pl-2 pt-1.5">
          <div className="flex items-center gap-2 rounded-t-lg bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-[0_-1px_2px_rgba(0,0,0,0.04)]">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-primary text-[8px] font-bold text-primary-foreground">
              D
            </span>
            <span className="max-w-[160px] truncate">Docalio</span>
            <X className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1" />
        {/* Contrôles fenêtre Windows : réduire / agrandir / fermer */}
        <div className="flex items-center self-start text-muted-foreground">
          <span className="flex h-8 w-11 items-center justify-center">
            <Minus className="h-3.5 w-3.5" />
          </span>
          <span className="flex h-8 w-11 items-center justify-center">
            <Square className="h-3 w-3" />
          </span>
          <span className="flex h-8 w-11 items-center justify-center">
            <X className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* Barre d'outils : navigation + barre d'adresse */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          <ArrowRight className="h-4 w-4 opacity-40" />
          <RotateCw className="ml-1 h-3.5 w-3.5" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 text-emerald-600" />
          <span className="truncate">{url}</span>
        </div>
      </div>

      {children}
    </div>
  );
}
