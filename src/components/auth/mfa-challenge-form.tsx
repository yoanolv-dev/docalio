"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(): string {
  const n = new URLSearchParams(window.location.search).get("next");
  if (n && n.startsWith("/") && !n.startsWith("//")) return n;
  return "/dashboard";
}

/** Second facteur : code à 6 chiffres de l'application d'authentification. */
export function MfaChallengeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = (factors?.totp ?? []).find((f) => f.status === "verified");
    if (!factor) {
      router.push(safeNextPath());
      return;
    }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.replace(/\s/g, ""),
    });
    if (err) {
      setLoading(false);
      setError("Code incorrect ou expiré. Saisissez le code affiché maintenant.");
      return;
    }
    router.push(safeNextPath());
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123 456"
        maxLength={7}
        className="h-12 text-center font-mono text-xl tracking-[0.3em]"
        aria-label="Code de vérification"
      />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button type="submit" className="h-10 w-full" disabled={loading || code.replace(/\s/g, "").length < 6}>
        {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
        Vérifier
      </Button>
      <button
        type="button"
        onClick={async () => {
          await createClient().auth.signOut();
          router.push("/login");
        }}
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Utiliser un autre compte
      </button>
    </form>
  );
}
