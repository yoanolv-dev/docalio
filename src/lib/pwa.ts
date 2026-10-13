"use client";

import { useSyncExternalStore } from "react";

// Installation de l'application : Chrome / Edge / Android exposent une invite
// (« beforeinstallprompt ») qu'on garde pour la proposer depuis le menu du
// compte ; Safari iOS n'en a pas, on y explique « Sur l'écran d'accueil ».

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallMode = "prompt" | "ios" | null;

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // pas de bandeau automatique (pages publiques, portail client)
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function installMode(): InstallMode {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return null;
  if (deferred) return "prompt";
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : null;
}

/** « prompt » : invite native disponible ; « ios » : marche à suivre ; null : déjà installée ou non prise en charge. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, installMode, () => null);
}

export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  emit();
  return choice.outcome === "accepted";
}
