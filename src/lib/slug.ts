/**
 * Transforme un texte libre en slug URL-safe.
 * Exemple : "Mon Entreprise & Co" -> "mon-entreprise-co"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // accents
    .replace(/[^a-z0-9]+/g, "-") // tout le reste -> tiret
    .replace(/^-+|-+$/g, "") // tirets en bordure
    .slice(0, 48);
}
