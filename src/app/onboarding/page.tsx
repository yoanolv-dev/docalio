import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata: Metadata = {
  title: "Bienvenue",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Déjà rattaché à une organisation → direction le dashboard.
  const membership = await getCurrentMembership();
  if (membership) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[--color-primary]">
            <FileText className="h-5 w-5 text-[--color-primary-foreground]" />
          </div>
          <h1 className="text-xl font-semibold">Créez votre organisation</h1>
          <p className="text-sm text-[--color-muted-foreground]">
            Dernière étape avant d&apos;accéder à votre espace de travail.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
