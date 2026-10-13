// Configuration publique (inlinée au build par Expo : variables EXPO_PUBLIC_*).
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? "https://docalio.app").replace(/\/+$/, "");

/** Bucket privé des fichiers (jamais public : accès par URL signée de courte durée). */
export const BUCKET = "documents";
