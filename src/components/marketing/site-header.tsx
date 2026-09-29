"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { COMPARE_NAV, MARKETING_NAV, SOLUTIONS_NAV } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ferme les menus à chaque navigation (ajustement pendant le rendu, cf.
  // « You might not need an effect »).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setMega(false);
  }

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMega(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mega]);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMegaSoon = () => {
    closeTimer.current = setTimeout(() => setMega(false), 120);
  };

  const inSolutions = pathname.startsWith("/solutions") || pathname.startsWith("/comparatif");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,box-shadow,border-color] duration-300",
        scrolled || open || mega
          ? "border-b border-border/70 bg-background/85 shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Docalio — accueil" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4">
          <Logo />
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          <div onMouseEnter={openMega} onMouseLeave={closeMegaSoon} className="relative">
            <button
              type="button"
              aria-expanded={mega}
              aria-controls="mega-solutions"
              onClick={() => setMega((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:text-foreground",
                inSolutions || mega ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Solutions
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", mega && "rotate-180")} />
            </button>

            {mega && (
              <div
                id="mega-solutions"
                className="animate-fade-up absolute left-1/2 top-full w-[640px] -translate-x-1/2 pt-3"
              >
                <div className="grid grid-cols-[1.5fr_1fr] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]">
                  <div className="p-3">
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Par métier
                    </p>
                    <ul className="grid grid-cols-2 gap-0.5">
                      {SOLUTIONS_NAV.map((s) => (
                        <li key={s.href}>
                          <Link href={s.href} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-muted">
                            <span className="block text-sm font-medium">{s.label}</span>
                            <span className="block text-xs text-muted-foreground">{s.description}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-l border-border bg-muted/40 p-3">
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Comparer
                    </p>
                    <ul className="space-y-0.5">
                      {COMPARE_NAV.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors hover:text-foreground",
                pathname === item.href ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button size="sm" className="rounded-full px-4" asChild>
            <Link href="/register">
              Essai gratuit
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-4 pb-6 pt-3 md:hidden">
          <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solutions</p>
          <ul className="mt-1 grid grid-cols-2 gap-1">
            {SOLUTIONS_NAV.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            {MARKETING_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
                {item.label}
              </Link>
            ))}
            <Link href="/comparatif/sharepoint" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
              Comparatifs
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
