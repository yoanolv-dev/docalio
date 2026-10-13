import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Stockage de la session dans le trousseau du système (Keychain iOS,
// Keystore Android), jamais en clair. Une session Supabase dépasse la taille
// conseillée d'une entrée (≈ 2 Ko) : la valeur est découpée en morceaux.

const CHUNK = 1800;
const web = Platform.OS === "web";
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

async function count(key: string): Promise<number> {
  return Number(await SecureStore.getItemAsync(`${key}.n`)) || 0;
}

async function removeItem(rawKey: string): Promise<void> {
  if (web) return globalThis.localStorage?.removeItem(rawKey);
  const key = safeKey(rawKey);
  const n = await count(key);
  await Promise.all([
    SecureStore.deleteItemAsync(key),
    SecureStore.deleteItemAsync(`${key}.n`),
    ...Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
  ]);
}

async function getItem(rawKey: string): Promise<string | null> {
  if (web) return globalThis.localStorage?.getItem(rawKey) ?? null;
  const key = safeKey(rawKey);
  const n = await count(key);
  if (n === 0) return SecureStore.getItemAsync(key);
  const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
  return parts.some((p) => p === null) ? null : parts.join("");
}

async function setItem(rawKey: string, value: string): Promise<void> {
  if (web) return globalThis.localStorage?.setItem(rawKey, value);
  const key = safeKey(rawKey);
  await removeItem(rawKey);
  if (value.length <= CHUNK) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  const parts: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK) parts.push(value.slice(i, i + CHUNK));
  await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
  await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
}

export const secureStorage = { getItem, setItem, removeItem };
