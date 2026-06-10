import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[--color-border] bg-[--color-background]/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[--color-primary]">
            <FileText className="h-4 w-4 text-[--color-primary-foreground]" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Docalio</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="#features"
            className="text-sm text-[--color-muted-foreground] transition-colors hover:text-[--color-foreground]"
          >
            Fonctionnalités
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-[--color-muted-foreground] transition-colors hover:text-[--color-foreground]"
          >
            Tarifs
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Démarrer gratuitement</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
