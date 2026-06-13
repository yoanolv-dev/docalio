"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Bouton « copier dans le presse-papiers » avec confirmation visuelle. */
export function CopyButton({
  value,
  label,
  copiedLabel = "Copié !",
  ...buttonProps
}: {
  value: string;
  label: string;
  copiedLabel?: string;
} & Omit<ButtonProps, "onClick" | "children">) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (navigateur restreint) : on ignore.
    }
  }

  return (
    <Button type="button" onClick={copy} {...buttonProps}>
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
