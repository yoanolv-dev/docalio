import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import { COMPARISONS, type Verdict } from "@/lib/marketing/comparisons";
import { cn } from "@/lib/utils";

export function VerdictIcon({ v, strong = false }: { v: Verdict; strong?: boolean }) {
  if (v === "yes")
    return (
      <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full", strong ? "bg-primary text-primary-foreground" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10")}>
        <Check className="h-3.5 w-3.5" aria-label="Oui" />
      </span>
    );
  if (v === "partial")
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10">
        <Minus className="h-3.5 w-3.5" aria-label="Partiellement" />
      </span>
    );
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <X className="h-3.5 w-3.5" aria-label="Non" />
    </span>
  );
}

const SHORT: Record<string, string> = {
  sharepoint: "SharePoint",
  "j-doc": "J-Doc",
  "email-wetransfer": "E-mail / WeTransfer",
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
};

/** Colonnes affichées sur la home, dans cet ordre. */
const MATRIX_SLUGS = ["google-drive", "dropbox", "sharepoint", "email-wetransfer"];

/** Critères mis en avant sur la home (sous-ensemble lisible). */
const MATRIX_CRITERIA = [
  "Accès client sans compte ni mot de passe",
  "Liens protégés par mot de passe, avec expiration",
  "Lien de dépôt inversé (le client vous envoie des fichiers)",
  "Liste de pièces à fournir, dépôt par le client",
  "Validation / modification / refus par document",
  "Suivi des ouvertures et téléchargements",
  "Portail à vos couleurs, par client",
  "Prix par organisation (pas par utilisateur)",
  "Données hébergées dans l'UE",
];

export function ComparisonMatrix() {
  const columns = MATRIX_SLUGS
    .map((slug) => COMPARISONS.find((c) => c.slug === slug))
    .filter((c): c is (typeof COMPARISONS)[number] => !!c);

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Comparatif Docalio et alternatives pour le stockage et l&apos;échange documentaire avec des clients</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="p-4 text-left font-medium text-muted-foreground">Pour votre travail client</th>
            <th scope="col" className="bg-primary-subtle/60 p-4 text-center font-semibold text-primary">Docalio</th>
            {columns.map((c) => (
              <th key={c.slug} scope="col" className="p-4 text-center font-medium">
                <Link href={`/comparatif/${c.slug}`} className="hover:text-primary hover:underline">
                  {SHORT[c.slug]}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_CRITERIA.map((criterion) => (
            <tr key={criterion} className="border-b border-border last:border-0">
              <th scope="row" className="p-4 text-left font-normal">{criterion}</th>
              <td className="bg-primary-subtle/60 p-4 text-center">
                <VerdictIcon v="yes" strong />
              </td>
              {columns.map((c) => {
                const match = c.rows.find((r) => r.criterion === criterion);
                return (
                  <td key={c.slug} className="p-4 text-center" title={match?.note}>
                    {match ? (
                      <VerdictIcon v={match.other} />
                    ) : (
                      <span className="text-muted-foreground" aria-label="Non comparé ici">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Comparaison pour l&apos;usage « stockage et échange documentaire avec des clients externes », d&apos;après les informations publiques des éditeurs. Détails et nuances sur chaque page comparative.
      </p>
    </div>
  );
}
