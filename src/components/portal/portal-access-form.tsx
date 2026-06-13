"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Saisie du lien d'accès sur la page d'accueil de marque. Le client colle le
 * lien sécurisé (ou le code) qui lui a été communiqué — le jeton reste le seul
 * secret. On extrait le jeton puis on ouvre /p/{token} (qui valide réellement).
 */
function extractToken(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  // Lien complet : on récupère la portion après /p/.
  const marker = "/p/";
  const idx = value.indexOf(marker);
  let token = idx !== -1 ? value.slice(idx + marker.length) : value;
  // Retire query/hash/slash résiduels.
  token = token.split(/[?#/]/)[0].trim();
  return token || null;
}

export function PortalAccessForm({ accent }: { accent: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) {
      setError("Saisissez le lien ou le code d'accès reçu.");
      return;
    }
    setError(null);
    setLoading(true);
    router.push(`/p/${encodeURIComponent(token)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Collez votre lien ou code d'accès"
            className="pl-9"
            aria-label="Lien ou code d'accès"
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          style={{ backgroundColor: accent }}
          className="text-white shadow-sm transition-opacity hover:opacity-90"
        >
          {loading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Accéder
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
