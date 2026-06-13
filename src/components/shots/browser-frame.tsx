import { Lock } from "lucide-react";

/** Cadre « fenêtre de navigateur » pour les captures produit. */
export function BrowserFrame({
  url,
  children,
  width = 1200,
}: {
  url: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)]"
      style={{ width }}
    >
      {/* Barre de fenêtre */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        </div>
        <div className="mx-auto flex w-full max-w-md items-center justify-center gap-1.5 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
