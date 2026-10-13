"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

/**
 * Double authentification par application (Google Authenticator, Microsoft
 * Authenticator, 1Password…) : activation par QR code, puis code à 6 chiffres
 * à chaque connexion. Gérée par Supabase Auth ; la base refuse ensuite toute
 * donnée à une session non vérifiée.
 */
export function MfaSetup({ onEnabled }: { onEnabled?: () => void }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFactors = useCallback(async () => {
    const { data } = await createClient().auth.mfa.listFactors();
    return ((data?.all ?? []) as Factor[]).filter((f) => f.status === "verified");
  }, []);

  const load = useCallback(async () => {
    setFactors(await fetchFactors());
  }, [fetchFactors]);

  useEffect(() => {
    let cancelled = false;
    fetchFactors().then((list) => {
      if (!cancelled) setFactors(list);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchFactors]);

  async function start() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // Un enrôlement abandonné bloquerait le suivant : on le nettoie.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of (existing?.all ?? []) as Factor[]) {
      if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Docalio ${new Date().toLocaleDateString("fr-FR")}`,
    });
    setBusy(false);
    if (err || !data) {
      setError("Activation impossible pour le moment. Réessayez.");
      return;
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.id,
      code: code.replace(/\s/g, ""),
    });
    setBusy(false);
    if (err) {
      setError("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.");
      return;
    }
    setEnrolling(null);
    setCode("");
    await load();
    onEnabled?.();
    router.refresh();
  }

  async function disable(factorId: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (err) {
      setError("Désactivation impossible : reconnectez-vous avec votre code, puis réessayez.");
      return;
    }
    await load();
    router.refresh();
  }

  if (factors === null) {
    return (
      <div className="flex justify-center py-6">
        <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (enrolling) {
    return (
      <form onSubmit={verify} className="space-y-5">
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">1</span>
            <div>
              <p className="font-medium">Scannez ce QR code avec votre application d&apos;authentification</p>
              <p className="text-muted-foreground">Google Authenticator, Microsoft Authenticator, 1Password…</p>
              <div className="mt-3 inline-block rounded-xl border border-border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrolling.qr} alt="QR code d'activation" className="h-44 w-44" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Impossible de scanner ? Saisissez la clé : <code className="select-all rounded bg-canvas px-1.5 py-0.5 font-mono">{enrolling.secret}</code>
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">2</span>
            <div className="flex-1">
              <p className="font-medium">Saisissez le code à 6 chiffres affiché</p>
              <Input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123 456"
                maxLength={7}
                className="mt-2 h-11 max-w-[12rem] text-center font-mono text-lg tracking-widest"
              />
            </div>
          </li>
        </ol>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy || code.replace(/\s/g, "").length < 6}>
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Activer
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEnrolling(null)} disabled={busy}>
            Annuler
          </Button>
        </div>
      </form>
    );
  }

  if (factors.length > 0) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          La double authentification est active sur votre compte.
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.friendly_name ?? "Application d'authentification"}</p>
                <p className="text-xs text-muted-foreground">Ajoutée le {new Date(f.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
              <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={busy} onClick={() => disable(f.id)}>
                Désactiver
              </Button>
            </li>
          ))}
        </ul>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl bg-canvas p-4 text-sm">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          En plus de votre mot de passe, un code temporaire généré par votre téléphone vous sera demandé à chaque
          connexion. Même avec votre mot de passe, personne ne pourra accéder à vos fichiers.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button onClick={start} disabled={busy}>
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Activer la double authentification
      </Button>
    </div>
  );
}
