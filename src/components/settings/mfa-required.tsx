"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { MfaSetup } from "@/components/settings/mfa-setup";
import { createClient } from "@/lib/supabase/client";

/** Écran bloquant : l'organisation exige la double authentification. */
export function MfaRequired({ orgName }: { orgName: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <LogoMark className="h-9 w-9" />
        <div className="mt-5 flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <p className="text-sm font-semibold">Sécurité renforcée</p>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          {orgName} exige la double authentification
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Activez-la une fois pour accéder au Drive. Cela prend une minute.
        </p>
        <div className="mt-6">
          <MfaSetup onEnabled={() => router.refresh()} />
        </div>
        <button
          type="button"
          onClick={async () => {
            await createClient().auth.signOut();
            router.push("/login");
          }}
          className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
