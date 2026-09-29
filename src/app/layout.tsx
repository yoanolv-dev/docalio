import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Docalio : Portail client : collecte de pièces et validation de documents",
    template: "%s | Docalio",
  },
  description: SITE.description,
  applicationName: "Docalio",
  keywords: [
    "portail client",
    "collecte de pièces justificatives",
    "portail client expert-comptable",
    "partage de documents sécurisé",
    "demande de documents client",
    "validation de documents en ligne",
    "alternative SharePoint",
    "alternative J-Doc",
  ],
  authors: [{ name: "Docalio" }],
  creator: "Docalio",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Docalio",
    title: "Docalio : Vos clients déposent leurs pièces. Sans relance.",
    description: SITE.description,
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "Docalio : Vos clients déposent leurs pièces. Sans relance.",
    description: SITE.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
