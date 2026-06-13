/**
 * Construit l'URL du portail client. Si un domaine de portail est configuré
 * (NEXT_PUBLIC_PORTAL_DOMAIN, ex. « docalio.app ») et que l'espace a un slug,
 * on produit un sous-domaine de marque : https://{slug}.{domaine}/p/{token}.
 * Sinon on retombe sur l'URL standard {baseUrl}/p/{token}.
 *
 * Le jeton reste le secret qui autorise l'accès : le sous-domaine n'est qu'un
 * habillage de marque.
 */
export function buildPortalUrl(
  baseUrl: string,
  token: string,
  slug: string | null | undefined
): string {
  const domain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN?.trim();
  if (domain && slug) {
    return `https://${slug}.${domain}/p/${token}`;
  }
  return `${baseUrl}/p/${token}`;
}

/** Aperçu du sous-domaine pour l'UI (ex. « margot.docalio.app »), ou null. */
export function portalSubdomainPreview(slug: string | null | undefined): string | null {
  const domain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN?.trim();
  if (domain && slug) return `${slug}.${domain}`;
  return null;
}
