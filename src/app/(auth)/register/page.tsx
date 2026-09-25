import { LogoMark } from "@/components/brand/logo";
import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Créer un compte",
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <LogoMark className="h-10 w-10" />
          <h1 className="text-xl font-semibold">Créer votre compte</h1>
          <p className="text-sm text-muted-foreground">
            Commencez gratuitement, sans carte bancaire
          </p>
        </div>

        <RegisterForm />

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
