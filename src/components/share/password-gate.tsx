"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { unlockLinkAction } from "@/lib/actions/public-links";

/** Saisie du mot de passe d'un lien protégé. */
export function PasswordGate({ token, locked, accent }: { token: string; locked: boolean; accent: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(locked ? "Trop d'essais. Réessayez dans quelques minutes." : null);
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await unlockLinkAction(token, password);
          if (r.ok) router.refresh();
          else setError(r.message);
        });
      }}
      className="mx-auto max-w-sm rounded-2xl border border-border bg-white p-6 text-center shadow-sm"
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100" style={{ color: accent }}>
        <KeyRound className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">Ce partage est protégé</h1>
      <p className="mt-1 text-sm text-muted-foreground">Saisissez le mot de passe qui vous a été communiqué.</p>
      <Input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-5 h-11"
        placeholder="Mot de passe"
        autoComplete="off"
        required
      />
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={pending || !password}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: accent }}
      >
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
        Accéder aux fichiers
      </button>
    </form>
  );
}
