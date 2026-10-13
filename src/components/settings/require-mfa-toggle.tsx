"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { setRequireMfaAction } from "@/lib/actions/organizations";
import { cn } from "@/lib/utils";

/** Interrupteur « 2FA obligatoire pour toute l'équipe » (administrateurs). */
export function RequireMfaToggle({ initial }: { initial: boolean }) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setRequireMfaAction(!on);
          if (r.ok) {
            setOn(!on);
            toast.show(!on ? "La double authentification est désormais obligatoire." : "La double authentification n'est plus obligatoire.");
          } else toast.error(r.message);
        })
      }
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
        on ? "bg-primary" : "bg-slate-300"
      )}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
      {pending && <LoaderCircle className="absolute -right-6 h-4 w-4 animate-spin text-muted-foreground" />}
    </button>
  );
}
