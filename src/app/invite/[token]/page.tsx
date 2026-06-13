import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Rejoindre une équipe",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let errorMessage: string | null = null;

  if (user) {
    const { error } = await supabase.rpc("accept_org_invite", { p_token: token });
    if (!error) {
      redirect("/dashboard");
    }
    errorMessage =
      "Cette invitation est invalide, expirée ou déjà utilisée.";
  }

  const next = `/invite/${encodeURIComponent(token)}`;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Docalio</span>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-base font-semibold">Invitation indisponible</p>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <Button className="mt-5 w-full" asChild>
              <Link href="/dashboard">Aller au tableau de bord</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-lg font-semibold tracking-tight">
              Rejoignez votre équipe sur Docalio
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous avez été invité·e à collaborer sur les espaces clients.
              Connectez-vous ou créez un compte pour accepter.
            </p>
            <div className="mt-5 space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/register?next=${encodeURIComponent(next)}`}>
                  Créer un compte
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/login?next=${encodeURIComponent(next)}`}>
                  J&apos;ai déjà un compte
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
