import type { Metadata } from "next";

// Pages internes servant uniquement à générer les captures produit.
// Non indexées, non liées depuis le site.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ShotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-10">
      <div id="shot" className="inline-block">
        {children}
      </div>
    </div>
  );
}
