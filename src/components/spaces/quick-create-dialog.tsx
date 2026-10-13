"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, LoaderCircle, Lock, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { quickCreateWorkspaceAction } from "@/lib/actions/workspaces";
import { cn } from "@/lib/utils";

/**
 * Création d'un espace du Drive en quelques secondes : un nom, qui y a accès
 * (toute l'équipe ou privé) et, si c'est un espace client, son portail avec
 * les pièces à lui demander.
 */
export function QuickCreateDialog({
  trigger,
  template,
  nameExample,
  clientByDefault = false,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: ReactNode;
  template: string[];
  nameExample: string;
  /** Organisation tournée vers ses clients : option « espace client » cochée. */
  clientByDefault?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (o: boolean) => {
    setInnerOpen(o);
    onOpenChange?.(o);
  };
  const [name, setName] = useState("");
  const [access, setAccess] = useState<"team" | "private">("team");
  const [isClient, setIsClient] = useState(clientByDefault);
  const [email, setEmail] = useState("");
  const [pieces, setPieces] = useState<string[]>(template);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setName("");
    setAccess("team");
    setIsClient(clientByDefault);
    setEmail("");
    setPieces(template);
    setSelected(new Set());
    setCustom("");
    setError(null);
  }

  function toggle(p: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    if (!pieces.includes(v)) setPieces((l) => [...l, v]);
    setSelected((s) => new Set(s).add(v));
    setCustom("");
  }

  const client = access === "team" && isClient;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await quickCreateWorkspaceAction({
        name,
        private: access === "private",
        client: client ? { email, pieces: pieces.filter((p) => selected.has(p)) } : null,
      });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setOpen(false);
      reset();
      router.push(`/dashboard/workspaces/${r.id}?nouveau=1`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[92dvh] max-w-lg gap-0 overflow-y-auto p-0">
        <form onSubmit={submit}>
          <div className="space-y-5 p-6">
            <div>
              <DialogTitle className="text-lg">Nouvel espace</DialogTitle>
              <DialogDescription className="mt-1">
                Un espace regroupe les dossiers et fichiers d&apos;un projet, d&apos;un client ou d&apos;un service.
              </DialogDescription>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Nom de l&apos;espace</span>
              <Input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Ex. ${nameExample}`}
                className="mt-1.5 h-11 text-base"
                maxLength={120}
              />
            </label>

            <div>
              <p className="text-sm font-medium">Qui y a accès ?</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    ["team", Users, "Toute l'équipe", "Visible par tous les membres"],
                    ["private", Lock, "Privé", "Vous, les admins et les personnes choisies"],
                  ] as const
                ).map(([id, Icon, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAccess(id)}
                    aria-pressed={access === id}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all",
                      access === id ? "border-primary bg-primary-subtle/50 ring-2 ring-primary/15" : "border-border hover:border-slate-300"
                    )}
                  >
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", access === id ? "text-primary" : "text-muted-foreground")} />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {access === "team" && (
              <div className="rounded-xl border border-border">
                <label className="flex cursor-pointer items-start gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={isClient}
                    onChange={(e) => setIsClient(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--primary)]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      C&apos;est un espace client
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Un portail sécurisé à ses couleurs pour consulter ses documents et vous déposer ses pièces.
                    </span>
                  </span>
                </label>

                {isClient && (
                  <div className="space-y-4 border-t border-border p-3">
                    <label className="block">
                      <span className="text-sm font-medium">
                        E-mail du client <span className="font-normal text-muted-foreground">(facultatif)</span>
                      </span>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@client.fr"
                        className="mt-1.5 h-10"
                      />
                    </label>
                    <div>
                      <p className="text-sm font-medium">
                        Pièces à lui demander <span className="font-normal text-muted-foreground">(facultatif)</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pieces.map((p) => {
                          const on = selected.has(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => toggle(p)}
                              aria-pressed={on}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                                on
                                  ? "border-primary/30 bg-primary-subtle text-primary"
                                  : "border-border bg-white text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                              {p}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={custom}
                          onChange={(e) => setCustom(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustom();
                            }
                          }}
                          placeholder="Autre pièce…"
                          className="h-9 text-sm"
                          maxLength={160}
                        />
                        <Button type="button" variant="outline" size="sm" className="h-9" onClick={addCustom} disabled={!custom.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <X className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-canvas/60 px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {access === "private"
                ? "Ajoutez des personnes ensuite, depuis l'espace."
                : client && selected.size
                  ? `${selected.size} pièce${selected.size > 1 ? "s" : ""} demandée${selected.size > 1 ? "s" : ""}`
                  : "Vous pourrez inviter des personnes extérieures."}
            </p>
            <Button type="submit" disabled={pending || !name.trim()} className="h-10 px-5">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Créer l&apos;espace
              {!pending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
