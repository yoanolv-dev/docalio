import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Cell = boolean | "partial";

const COLUMNS = [
  "Docalio",
  "Email",
  "Drive / Dropbox",
  "WeTransfer",
  "DocSend",
];

const ROWS: { label: string; values: [Cell, Cell, Cell, Cell, Cell] }[] = [
  {
    label: "Espace privé dédié par client",
    values: [true, false, "partial", false, "partial"],
  },
  {
    label: "Suivi des ouvertures & téléchargements",
    values: [true, false, "partial", "partial", true],
  },
  {
    label: "Décisions client (valider / modifier / refuser)",
    values: [true, false, false, false, false],
  },
  {
    label: "Relances guidées selon l'activité réelle",
    values: [true, false, false, false, false],
  },
  {
    label: "Contrôle fin du téléchargement",
    values: [true, false, "partial", false, true],
  },
  {
    label: "Liens expirables & révocables",
    values: [true, false, "partial", true, true],
  },
  {
    label: "Portail à votre image, sans compte client",
    values: [true, false, false, false, "partial"],
  },
];

function CellValue({ value, primary }: { value: Cell; primary: boolean }) {
  if (value === "partial") {
    return <span className="text-xs text-amber-600 dark:text-amber-400">Limité</span>;
  }
  if (value) {
    return (
      <Check
        className={cn(
          "mx-auto h-4 w-4",
          primary ? "text-primary" : "text-emerald-600 dark:text-emerald-400"
        )}
      />
    );
  }
  return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />;
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="w-1/3 px-4 py-3 text-left font-medium text-muted-foreground" />
            {COLUMNS.map((col, i) => (
              <th
                key={col}
                className={cn(
                  "px-4 py-3 text-center font-semibold",
                  i === 0
                    ? "rounded-t-xl bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, ri) => (
            <tr key={row.label}>
              <td className="border-t border-border px-4 py-3 text-left font-medium">
                {row.label}
              </td>
              {row.values.map((value, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "border-t border-border px-4 py-3 text-center",
                    ci === 0 && "bg-primary-subtle/50",
                    ci === 0 && ri === ROWS.length - 1 && "rounded-b-xl"
                  )}
                >
                  <CellValue value={value} primary={ci === 0} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
