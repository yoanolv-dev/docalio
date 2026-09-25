import { LogoMark } from "@/components/brand/logo";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <LogoMark className="h-10 w-10" />
          <h1 className="text-xl font-semibold">Connexion à Docalio</h1>
          <p className="text-sm text-muted-foreground">
            Accédez à votre espace de travail
          </p>
        </div>

        <LoginForm />

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
