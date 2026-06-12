import Link from "next/link";
import { FileText } from "lucide-react";
import { MARKETING_NAV } from "@/lib/site";

const RESOURCES = [
  { label: "Comparatif", href: "/cas-usage#comparatif" },
  { label: "Sécurité", href: "/securite" },
  { label: "Contact & démo", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm tracking-tight">Docalio</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Le portail documentaire client sécurisé. Plus professionnel
              qu&apos;un email, plus actionnable qu&apos;un Drive.
            </p>
          </div>

          <FooterColumn title="Produit" links={MARKETING_NAV} />
          <FooterColumn title="Ressources" links={RESOURCES} />

          <div>
            <p className="text-sm font-semibold">Commencer</p>
            <ul className="mt-3 space-y-2">
              <li>
                <FooterLink href="/register" label="Créer un compte" />
              </li>
              <li>
                <FooterLink href="/login" label="Connexion" />
              </li>
              <li>
                <FooterLink href="/contact" label="Demander une démo" />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Docalio. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Conçu pour la confidentialité des documents clients.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <FooterLink href={l.href} label={l.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </Link>
  );
}
