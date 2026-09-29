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
};

export function ComparisonMatrix() {
  const criteria = COMPARISONS[0].rows.map((r) => r.criterion);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Comparatif Docalio et alternatives pour l&apos;échange documentaire avec des clients</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="p-4 text-left font-medium text-muted-foreground">Pour vos clients</th>
            <th scope="col" className="bg-primary-subtle/60 p-4 text-center font-semibold text-primary">Docalio</th>
            {COMPARISONS.map((c) => (
              <th key={c.slug} scope="col" className="p-4 text-center font-medium">
                <Link href={`/comparatif/${c.slug}`} className="hover:text-primary hover:underline">
                  {SHORT[c.slug]}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion, i) => (
            <tr key={criterion} className="border-b border-border last:border-0">
              <th scope="row" className="p-4 text-left font-normal">{criterion}</th>
              <td className="bg-primary-subtle/60 p-4 text-center">
                <VerdictIcon v="yes" strong />
              </td>
              {COMPARISONS.map((c) => (
                <td key={c.slug} className="p-4 text-center" title={c.rows[i]?.note}>
                  <VerdictIcon v={c.rows[i]?.other ?? "no"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Comparaison pour l&apos;usage « échange documentaire avec des clients externes », d&apos;après les informations publiques des éditeurs. Détails et nuances sur chaque page comparative.
      </p>
    </div>
  );
}
