import { LogoMark } from "@/components/brand/logo";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Invitation",
  robots: { index: false, follow: false },
};

interface InvitePreview {
  organization: string;
  logo_url: string | null;
  primary_color: string | null;
  role: "admin" | "member" | "guest";
  access_level: "viewer" | "editor";
  spaces: string[];
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data: auth }, { data: previewData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("get_invite_preview", { p_token: token }),
  ]);
  const user = auth.user;
  const preview = (previewData ?? null) as InvitePreview | null;

  let errorMessage: string | null = null;

  if (user) {
    const { data: orgId, error } = await supabase.rpc("accept_org_invite", { p_token: token });
    if (!error && orgId) {
      // L'organisation qui invite devient l'organisation active.
      redirect(`/dashboard/switch?org=${orgId as string}`);
    }
    errorMessage = "Cette invitation est invalide, expirée ou déjà utilisée.";
  } else if (!preview) {
    errorMessage = "Cette invitation est invalide, expirée ou déjà utilisée.";
  }

  const next = `/invite/${encodeURIComponent(token)}`;
  const guest = preview?.role === "guest";

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-2">
          <LogoMark className="h-11 w-11" />
          <span className="text-sm font-semibold tracking-tight">Docalio</span>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-base font-semibold">Invitation indisponible</p>
            <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            <Button className="mt-5 w-full" asChild>
              <Link href="/dashboard">Aller à mon Drive</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
              {guest ? <FolderOpen className="h-6 w-6" /> : <Users className="h-6 w-6" />}
            </div>
            <h1 className="mt-4 text-lg font-semibold tracking-tight">
              {guest
                ? `${preview?.organization} partage des fichiers avec vous`
                : `Rejoignez ${preview?.organization ?? "votre équipe"} sur Docalio`}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {guest
                ? `Vous êtes invité·e dans ${preview?.spaces.length === 1 ? `l'espace « ${preview.spaces[0]} »` : `${preview?.spaces.length} espaces`}, ${preview?.access_level === "viewer" ? "en lecture" : "avec la possibilité d'ajouter et de modifier des fichiers"}. C'est gratuit.`
                : "Vous avez été invité·e à rejoindre l'équipe. Connectez-vous ou créez un compte pour accepter."}
            </p>
            <div className="mt-5 space-y-2">
              <Button className="w-full" asChild>
                <Link href={`/register?next=${encodeURIComponent(next)}`}>Créer mon compte</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/login?next=${encodeURIComponent(next)}`}>J&apos;ai déjà un compte</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
