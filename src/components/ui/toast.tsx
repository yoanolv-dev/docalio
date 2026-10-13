"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  tone: "default" | "error";
  action?: ToastAction;
}

interface ToastApi {
  show: (message: string, options?: { action?: ToastAction; tone?: Toast["tone"]; duration?: number }) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Notifications éphémères en bas de l'écran, avec action facultative
 * (« Annuler » après une suppression ou un déplacement).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, options) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, tone: options?.tone ?? "default", action: options?.action }]);
      window.setTimeout(() => dismiss(id), options?.duration ?? (options?.action ? 7000 : 4000));
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({ show, error: (message) => show(message, { tone: "error", duration: 6000 }) }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-xl shadow-slate-900/15",
              t.tone === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
            )}
          >
            {t.tone === "error" ? (
              <CircleAlert className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-md px-2 py-1 font-semibold text-sky-300 transition-colors hover:bg-white/10"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé sous <ToastProvider>");
  return ctx;
}
