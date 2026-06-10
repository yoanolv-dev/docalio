import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-primary]">
            <FileText className="h-5 w-5 text-[--color-primary-foreground]" />
          </div>
          <h1 className="text-xl font-semibold">Connexion à Docalio</h1>
          <p className="text-sm text-[--color-muted-foreground]">
            Accédez à votre espace de travail
          </p>
        </div>

        <LoginForm />

        <p className="mt-4 text-center text-sm text-[--color-muted-foreground]">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium text-[--color-foreground] underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
