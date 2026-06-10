import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-primary]">
            <FileText className="h-5 w-5 text-[--color-primary-foreground]" />
          </div>
          <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
          <p className="text-sm text-[--color-muted-foreground]">
            Choisissez un nouveau mot de passe pour votre compte.
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
