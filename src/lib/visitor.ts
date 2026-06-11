const VISITOR_KEY = "docalio_vid";

/**
 * Identifiant de visiteur anonyme (aléatoire), stocké en localStorage.
 * Aucune donnée personnelle, aucun fingerprint : sert seulement à distinguer
 * des sessions de consultation côté analytics internes.
 */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}
