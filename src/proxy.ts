import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Sous-domaine de marque : si un domaine de portail est configuré
 * (NEXT_PUBLIC_PORTAL_DOMAIN, ex. « docalio.app »), la racine d'un sous-domaine
 * client (boulangerie-margot.docalio.app/) affiche la page d'accueil de marque.
 * Tant que la variable n'est pas définie (avant le lancement v1), cette logique
 * est totalement inerte — rien à configurer côté infra aujourd'hui.
 * Les liens /p/{token} passent inchangés : le jeton reste l'unique secret.
 */
function portalSubdomainRewrite(request: NextRequest): NextResponse | null {
  const domain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN?.trim();
  if (!domain) return null;

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const suffix = `.${domain}`;
  if (!host.endsWith(suffix)) return null;

  const sub = host.slice(0, -suffix.length);
  if (!sub || sub === "www" || sub === "app") return null;

  // Seule la racine est réécrite vers l'accueil de marque ; /p/{token} et le
  // reste passent tels quels.
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/espace/${sub}`;
    return NextResponse.rewrite(url);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const subdomainRewrite = portalSubdomainRewrite(request);
  if (subdomainRewrite) return subdomainRewrite;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Si la résolution de session échoue (réseau / configuration), on dégrade
  // proprement : aucun utilisateur. Les routes protégées redirigent alors vers
  // /login plutôt que de renvoyer une erreur 500.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;

  // Routes protégées (nécessitent une session)
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rediriger les utilisateurs déjà connectés hors des pages d'authentification.
  // /reset-password est volontairement exclu : il s'utilise avec une session
  // de récupération active.
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
