import { FileText, Download, CheckCircle, PencilLine, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Aperçu produit réaliste (portail client) entièrement en HTML/CSS.
// Aucune image, aucun logo fictif : une mise en scène du produit.

const DOCS = [
  {
    title: "Proposition commerciale.pdf",
    meta: "PDF · 1.4 Mo",
    badge: { label: "Approuvé", variant: "success" as const, icon: CheckCircle },
  },
  {
    title: "Contrat de prestation.pdf",
    meta: "PDF · 820 Ko",
    badge: { label: "À consulter", variant: "info" as const, icon: Eye },
  },
  {
    title: "Planning projet.xlsx",
    meta: "Excel · 96 Ko",
    badge: {
      label: "Modification demandée",
      variant: "warning" as const,
      icon: PencilLine,
    },
  },
];

export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-slate-900/5">
      {/* Chrome navigateur */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-400">🔒</span>
          docalio.app/p/d8f3a1•••
        </div>
      </div>

      {/* Portail */}
      <div className="bg-muted/30 p-5 sm:p-6">
        {/* En-tête de marque */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            AL
          </div>
          <div>
            <p className="text-sm font-semibold">Agence Lumen</p>
            <p className="text-xs text-muted-foreground">Espace documentaire</p>
          </div>
        </div>

        <h3 className="mt-5 text-lg font-semibold tracking-tight">
          Refonte du site — Garage Martin
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Agence Lumen partage avec vous les documents ci-dessous.
        </p>

        {/* Documents */}
        <div className="mt-4 space-y-2">
          {DOCS.map((doc) => {
            const Icon = doc.badge.icon;
            return (
              <div
                key={doc.title}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{doc.meta}</p>
                </div>
                <Badge variant={doc.badge.variant} className="hidden sm:inline-flex">
                  <Icon className="h-3 w-3" />
                  {doc.badge.label}
                </Badge>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Accès sécurisé — aucun compte requis
        </p>
      </div>
    </div>
  );
}
