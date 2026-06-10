"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (m.includes("password")) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (m.includes("valid email") || m.includes("invalid")) {
    return "Adresse email invalide.";
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
      return;
    }

    // Confirm email désactivé → session immédiate → on enchaîne vers l'app.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Confirm email activé → pas de session, l'utilisateur doit confirmer.
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-md border border-[--color-border] bg-[--color-muted] px-4 py-5 text-center">
        <p className="text-sm font-medium">Compte créé 🎉</p>
        <p className="mt-1 text-sm text-[--color-muted-foreground]">
          Vérifiez votre boîte mail ({email}) pour confirmer votre adresse, puis
          connectez-vous.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Nom complet</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Jean Dupont"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="vous@exemple.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-[--color-muted-foreground]">
          Minimum 8 caractères
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Création du compte..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
