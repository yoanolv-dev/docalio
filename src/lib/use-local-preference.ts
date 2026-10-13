"use client";

import { useCallback, useSyncExternalStore } from "react";

// Préférence d'affichage mémorisée dans le navigateur (vue liste / grille,
// tri). Aucune donnée sensible ; si le stockage est indisponible (navigation
// privée), la valeur par défaut s'applique simplement.

const EVENT = "docalio:preference";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLocalPreference<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[]
): [T, (value: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );
  const value = raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
  const set = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Stockage indisponible : la préférence ne sera pas mémorisée.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );
  return [value, set];
}
