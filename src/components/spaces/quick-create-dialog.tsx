"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle, Plus, X } from "lucide-react";
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
 * Création express d'un espace client : un nom, un e-mail facultatif, et les
 * pièces types du métier déjà cochées. Le lien client est créé d'office :
 * l'utilisateur arrive sur un espace prêt à être envoyé.
 */
export function QuickCreateDialog({
  trigger,
  template,
  nameExample,
  internal = false,
  defaultOpen = false,
}: {
  trigger: ReactNode;
  template: string[];
  nameExample: string;
  /** Organisation « interne » : pas d'e-mail client ni de pièces. */
  internal?: boolean;
  /** Ouvert d'emblée (raccourci « Nouvel espace » de la palette). */
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pieces, setPieces] = useState<string[]>(template);
  const [selected, setSelected] = useState<Set<string>>(new Set(template));
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setName("");
    setEmail("");
    setPieces(template);
    setSelected(new Set(template));
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await quickCreateWorkspaceAction({
        name,
        clientEmail: email,
        pieces: internal ? [] : pieces.filter((p) => selected.has(p)),
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <form onSubmit={submit}>
          <div className="space-y-5 p-6">
            <div>
              <DialogTitle className="text-lg">
                {internal ? "Nouvel espace" : "Nouveau client"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {internal
                  ? "Un espace pour partager des documents avec votre équipe."
                  : "Son espace et son lien sécurisé sont créés en un clic."}
              </DialogDescription>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium">{internal ? "Nom de l'espace" : "Nom du client"}</span>
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
              {!internal && (
                <label className="block">
                  <span className="text-sm font-medium">
                    E-mail du client <span className="font-normal text-muted-foreground">(facultatif)</span>
                  </span>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@client.fr"
                    className="mt-1.5 h-11"
                  />
                </label>
              )}
            </div>

            {!internal && (
              <div>
                <p className="text-sm font-medium">Pièces à lui demander</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Décochez ce qui ne s&apos;applique pas. Modifiable ensuite.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
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
                            : "border-border bg-white text-muted-foreground line-through decoration-muted-foreground/40 hover:text-foreground"
                        )}
                      >
                        {on ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
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
            )}

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border bg-canvas/60 px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {internal ? "" : `${selected.size} pièce${selected.size > 1 ? "s" : ""} demandée${selected.size > 1 ? "s" : ""}`}
            </p>
            <Button type="submit" disabled={pending || !name.trim()} className="h-10 px-5">
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {internal ? "Créer l'espace" : "Créer et obtenir le lien"}
              {!pending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
