import type { Metadata } from "next";
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
    default: "Docalio — Le portail documentaire client sécurisé",
    template: "%s | Docalio",
  },
  description: SITE.description,
  applicationName: "Docalio",
  keywords: [
    "portail client",
    "partage de documents sécurisé",
    "espace client",
    "suivi de documents",
    "validation client",
    "alternative Drive",
    "data room légère",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Docalio",
    title: "Docalio — Le portail documentaire client sécurisé",
    description: SITE.description,
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "Docalio — Le portail documentaire client sécurisé",
    description: SITE.description,
  },
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
