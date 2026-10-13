import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";

export const metadata: Metadata = {
  title: "Vérification",
  robots: { index: false, follow: false },
};

export default function MfaVerificationPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <LogoMark className="h-10 w-10" />
          <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Vérification en deux étapes
          </h1>
          <p className="text-sm text-muted-foreground">
            Saisissez le code à 6 chiffres affiché par votre application d&apos;authentification.
          </p>
        </div>
        <MfaChallengeForm />
      </div>
    </div>
  );
}
