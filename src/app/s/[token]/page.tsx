import type { Metadata } from "next";
import Link from "next/link";
import { Link2Off, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { PasswordGate } from "@/components/share/password-gate";
import { SharedLinkView } from "@/components/share/shared-link-view";
import { getPublicLink, type PublicLinkBrand } from "@/lib/public-link";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Fichiers partagés",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Shell({ brand, children }: { brand: PublicLinkBrand | null; children: React.ReactNode }) {
  const accent = brand?.primary_color ?? "#2563eb";
  return (
    <div className="min-h-[100dvh] bg-canvas">
      <div aria-hidden className="h-1.5" style={{ backgroundColor: accent }} />
      <header className="border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          {brand ? (
            <div className="flex min-w-0 items-center gap-3">
              {brand.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-black/5" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: accent }}>
                  {getInitials(brand.name)}
                </span>
              )}
              <span className="truncate text-sm font-semibold">{brand.name}</span>
            </div>
          ) : (
            <LogoMark className="h-8 w-8" />
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Partage sécurisé
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="pb-10 text-center text-xs text-muted-foreground">
        {brand && brand.plan !== "starter" ? (
          "Fichiers hébergés en Europe, transmis par lien chiffré."
        ) : (
          <Link href="/" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <LogoMark className="h-4 w-4" />
            Partagé avec Docalio
          </Link>
        )}
      </footer>
    </div>
  );
}

export default async function SharedLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ dossier?: string }>;
}) {
  const [{ token }, { dossier }] = await Promise.all([params, searchParams]);
  const data = await getPublicLink(token, dossier ?? null);

  if (data.status === "invalid") {
    return (
      <Shell brand={null}>
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-muted-foreground">
            <Link2Off className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">Lien indisponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien de partage est invalide, a expiré ou a été révoqué. Demandez un nouveau lien à votre contact.
          </p>
        </div>
      </Shell>
    );
  }

  const accent = data.organization.primary_color ?? "#2563eb";
  if (data.status !== "ok") {
    return (
      <Shell brand={data.organization}>
        <PasswordGate token={token} locked={data.status === "locked"} accent={accent} />
      </Shell>
    );
  }

  return (
    <Shell brand={data.organization}>
      <SharedLinkView token={token} data={data} />
    </Shell>
  );
}
