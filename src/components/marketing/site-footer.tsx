import Link from "next/link";
import { ArrowRight, Globe2, LockKeyhole, ServerCog, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  COMPARE_NAV,
  LEGAL_NAV,
  SITE,
  SOLUTIONS_NAV,
  type NavLink,
} from "@/lib/site";

const PRODUCT: NavLink[] = [
  { label: "Fonctionnalités", href: "/fonctionnalites" },
  { label: "Collecte de pièces", href: "/fonctionnalites#collecte" },
  { label: "Portail client", href: "/fonctionnalites#portail" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Sécurité", href: "/securite" },
];

const COMPANY: NavLink[] = [
  { label: "Demander une démo", href: "/contact" },
  { label: "Cas d'usage", href: "/cas-usage" },
  { label: "Créer un compte", href: "/register" },
  { label: "Connexion", href: "/login" },
];

const TRUST = [
  { icon: Globe2, label: "Hébergé dans l'UE" },
  { icon: LockKeyhole, label: "Stockage privé, liens signés" },
  { icon: ShieldCheck, label: "Isolation par organisation" },
  { icon: ServerCog, label: "Suivi sans traçage publicitaire" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#0b1224] text-slate-300">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.22),transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Pré-footer : dernier appel à l'action */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-12 md:flex-row md:items-center">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Votre prochain dossier client, sans une seule relance.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Gratuit pour démarrer · Sans carte bancaire · Prêt en 5 minutes
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5"
            >
              Créer mon portail
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Voir une démo
            </Link>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="Docalio : accueil">
              <Logo inverted />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Le portail client des cabinets et agences : vos clients déposent
              leurs pièces, valident vos documents, et vous suivez tout.
            </p>
            <a
              href={`mailto:${SITE.email}`}
              className="mt-4 inline-block text-sm text-slate-300 underline-offset-4 hover:text-white hover:underline"
            >
              {SITE.email}
            </a>
          </div>
          <FooterColumn title="Produit" links={PRODUCT} />
          <FooterColumn title="Solutions" links={SOLUTIONS_NAV} />
          <FooterColumn title="Comparer" links={COMPARE_NAV} />
          <FooterColumn title="Docalio" links={COMPANY} />
        </div>

        <ul className="grid gap-3 border-t border-white/10 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label} className="flex items-center gap-2 text-xs text-slate-400">
                <Icon className="h-4 w-4 text-blue-400" />
                {t.label}
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {year} Docalio. Tous droits réservés.</p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGAL_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-slate-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-400 transition-colors hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
