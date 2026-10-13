"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemIcon } from "@/components/drive/item-icon";
import { createClient } from "@/lib/supabase/client";
import {
  discardUploadsAction,
  ensureFolderPathAction,
  prepareUploadAction,
  registerUploadAction,
} from "@/lib/actions/drive";
import { uploadToStorage, UploadError } from "@/lib/storage-upload";
import type { UploadEntry } from "@/lib/drop-files";
import { formatBytes, uniqueFileName } from "@/lib/files";
import { cn } from "@/lib/utils";

// =============================================================================
// Envois de fichiers : file d'attente globale (survit à la navigation dans le
// Drive), dépôt direct dans le bucket privé, 3 envois en parallèle, gestion
// des doublons (nouvelle version / garder les deux / ignorer), import de
// dossiers entiers, progression et annulation.
// =============================================================================

export interface UploadTarget {
  workspaceId: string;
  folderId: string | null;
  /** Fichiers déjà présents dans le dossier de destination (doublons). */
  existing: { id: string; name: string }[];
  /** Nouvelle version explicite d'un fichier existant (garde son nom). */
  replace?: { id: string; name: string };
}

type Status = "waiting" | "uploading" | "saving" | "done" | "error" | "canceled";

interface Item {
  id: string;
  name: string;
  size: number;
  mime: string;
  status: Status;
  progress: number;
  error?: string;
  replaced?: boolean;
}

interface UploadApi {
  enqueue: (target: UploadTarget, entries: UploadEntry[]) => void;
  busy: boolean;
}

const UploadContext = createContext<UploadApi | null>(null);

export function useUploads(): UploadApi {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploads doit être utilisé sous <UploadProvider>");
  return ctx;
}

type ConflictChoice = "replace" | "keep" | "skip";

interface ConflictPrompt {
  names: string[];
  resolve: (choice: ConflictChoice | null) => void;
}

const CONCURRENCY = 3;
let seq = 0;

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [conflict, setConflict] = useState<ConflictPrompt | null>(null);
  const aborters = useRef(new Map<string, () => void>());
  const refreshTimer = useRef<number | null>(null);

  const patch = useCallback((id: string, update: Partial<Item>) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...update } : it)));
  }, []);

  // Les fichiers apparaissent dans la liste au fil de l'eau (rafraîchissement
  // groupé, au plus toutes les 1,2 s).
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current !== null) return;
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, 1200);
  }, [router]);

  const busy = items.some((i) => i.status === "waiting" || i.status === "uploading" || i.status === "saving");

  // Avertit avant de quitter la page pendant un envoi.
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  const askConflict = useCallback(
    (names: string[]) =>
      new Promise<ConflictChoice | null>((resolve) => setConflict({ names, resolve })),
    []
  );

  const enqueue = useCallback<UploadApi["enqueue"]>(
    (target, entries) => {
      if (entries.length === 0) return;
      void (async () => {
        // 1. Doublons parmi les fichiers déposés directement dans le dossier.
        const existingByName = new Map(target.existing.map((e) => [e.name.toLowerCase(), e.id]));
        const direct = entries.filter((e) => !e.relativeDir);
        const clashes = target.replace ? [] : direct.filter((e) => existingByName.has(e.file.name.toLowerCase()));
        let choice: ConflictChoice = "keep";
        if (clashes.length) {
          const answer = await askConflict(clashes.map((c) => c.file.name));
          if (answer === null) return;
          choice = answer;
        }

        const taken = new Set(target.existing.map((e) => e.name));
        const plan: { entry: UploadEntry; name: string; replaceId: string | null }[] = [];
        if (target.replace) {
          plan.push({ entry: { ...entries[0], relativeDir: "" }, name: target.replace.name, replaceId: target.replace.id });
        }
        for (const entry of target.replace ? [] : entries) {
          const clashId = !entry.relativeDir ? existingByName.get(entry.file.name.toLowerCase()) : undefined;
          if (clashId && choice === "skip") continue;
          if (clashId && choice === "replace") {
            plan.push({ entry, name: entry.file.name, replaceId: clashId });
            continue;
          }
          const name = entry.relativeDir ? entry.file.name : uniqueFileName(entry.file.name, taken);
          if (!entry.relativeDir) taken.add(name);
          plan.push({ entry, name, replaceId: null });
        }
        if (plan.length === 0) return;

        const batch: Item[] = plan.map((p) => ({
          id: `u${++seq}`,
          name: p.name,
          size: p.entry.file.size,
          mime: p.entry.file.type,
          status: "waiting",
          progress: 0,
        }));
        setCollapsed(false);
        setItems((list) => [...list.filter((i) => i.status !== "done" && i.status !== "canceled"), ...batch]);

        // 2. Dossiers à recréer (import d'un dossier entier).
        const folderFor = new Map<string, string | null | undefined>([["", target.folderId]]);
        const dirs = [...new Set(plan.map((p) => p.entry.relativeDir).filter(Boolean))].sort(
          (a, b) => a.split("/").length - b.split("/").length
        );
        for (const dir of dirs) {
          const r = await ensureFolderPathAction(target.workspaceId, target.folderId, dir.split("/"));
          folderFor.set(dir, r.ok ? r.folderId : undefined);
          if (!r.ok) {
            plan.forEach((p, i) => {
              if (p.entry.relativeDir === dir) patch(batch[i].id, { status: "error", error: r.message });
            });
          }
        }
        if (dirs.length) scheduleRefresh();

        // 3. Réservation des chemins (droits, taille, quota).
        const prepared = await prepareUploadAction({
          workspaceId: target.workspaceId,
          files: plan.map((p) => ({ name: p.name, size: p.entry.file.size })),
        });
        if (!prepared.ok) {
          batch.forEach((b) => patch(b.id, { status: "error", error: prepared.message }));
          return;
        }

        const supabase = createClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token ?? null;

        // 4. Envois, 3 à la fois.
        let cursor = 0;
        const worker = async () => {
          while (cursor < plan.length) {
            const index = cursor++;
            const p = plan[index];
            const item = batch[index];
            const reserved = prepared.uploads[index];
            const folderId = folderFor.get(p.entry.relativeDir);
            if (folderId === undefined) continue;
            if (!reserved || "error" in reserved) {
              patch(item.id, { status: "error", error: reserved && "error" in reserved ? reserved.error : "Envoi impossible." });
              continue;
            }

            patch(item.id, { status: "uploading" });
            const handle = uploadToStorage(p.entry.file, reserved.path, token, (fraction) =>
              patch(item.id, { progress: fraction })
            );
            aborters.current.set(item.id, handle.abort);
            try {
              await handle.promise;
            } catch (err) {
              aborters.current.delete(item.id);
              const canceled = err instanceof UploadError && err.status === 0;
              patch(item.id, {
                status: canceled ? "canceled" : "error",
                error: canceled ? undefined : err instanceof Error ? err.message : "Envoi impossible.",
              });
              void discardUploadsAction([reserved.path]);
              continue;
            }
            aborters.current.delete(item.id);

            patch(item.id, { status: "saving", progress: 1 });
            const saved = await registerUploadAction({
              workspaceId: target.workspaceId,
              folderId,
              path: reserved.path,
              name: p.name,
              type: p.entry.file.type || null,
              replaceDocumentId: p.replaceId,
            });
            if (saved.ok) {
              patch(item.id, { status: "done", replaced: saved.replaced });
              scheduleRefresh();
            } else {
              patch(item.id, { status: "error", error: saved.message });
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, plan.length) }, worker));
      })();
    },
    [askConflict, patch, scheduleRefresh]
  );

  const api = useMemo<UploadApi>(() => ({ enqueue, busy }), [enqueue, busy]);

  function cancel(id: string) {
    const abort = aborters.current.get(id);
    if (abort) abort();
    else patch(id, { status: "canceled" });
  }

  function cancelAll() {
    for (const it of items) {
      if (it.status === "waiting" || it.status === "uploading") cancel(it.id);
    }
  }

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const totalBytes = items.reduce((s, i) => s + (i.status === "canceled" ? 0 : i.size), 0);
  const sentBytes = items.reduce((s, i) => s + (i.status === "canceled" ? 0 : i.size * i.progress), 0);
  const percent = totalBytes ? Math.round((sentBytes / totalBytes) * 100) : 0;

  return (
    <UploadContext.Provider value={api}>
      {children}

      {items.length > 0 && (
        <div className="animate-toast-in fixed bottom-4 right-4 z-[110] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-white shadow-2xl shadow-slate-900/15 sm:w-96">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white">
            {busy ? (
              <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-sky-300" />
            ) : failed ? (
              <CircleAlert className="h-4 w-4 shrink-0 text-amber-300" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              {busy
                ? `Envoi en cours · ${percent} %`
                : failed
                  ? `${done} importé${done > 1 ? "s" : ""}, ${failed} en échec`
                  : `${done} fichier${done > 1 ? "s" : ""} importé${done > 1 ? "s" : ""}`}
            </p>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Déplier" : "Replier"}
              className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (busy) cancelAll();
                else setItems([]);
              }}
              aria-label={busy ? "Tout annuler" : "Fermer"}
              title={busy ? "Tout annuler" : "Fermer"}
              className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {busy && (
            <div className="h-1 bg-slate-100">
              <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
          )}
          {!collapsed && (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                  <ItemIcon kind="file" name={it.name} mime={it.mime} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", it.status === "canceled" && "text-muted-foreground line-through")}>
                      {it.name}
                    </p>
                    {it.status === "error" ? (
                      <p className="truncate text-xs text-red-600" title={it.error}>{it.error}</p>
                    ) : it.status === "uploading" ? (
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${Math.round(it.progress * 100)}%` }} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {it.status === "waiting" && `En attente · ${formatBytes(it.size)}`}
                        {it.status === "saving" && "Enregistrement…"}
                        {it.status === "done" && (it.replaced ? "Nouvelle version enregistrée" : formatBytes(it.size))}
                        {it.status === "canceled" && "Annulé"}
                      </p>
                    )}
                  </div>
                  {it.status === "done" ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : it.status === "waiting" || it.status === "uploading" ? (
                    <button
                      type="button"
                      onClick={() => cancel(it.id)}
                      aria-label={`Annuler ${it.name}`}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : it.status === "saving" ? (
                    <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (!open && conflict) {
            conflict.resolve(null);
            setConflict(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <div>
            <DialogTitle>
              {conflict && conflict.names.length > 1
                ? `${conflict.names.length} fichiers existent déjà`
                : `« ${conflict?.names[0] ?? ""} » existe déjà`}
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              Remplacez-les par une nouvelle version (l&apos;ancienne reste dans l&apos;historique) ou gardez
              les deux fichiers.
            </DialogDescription>
          </div>
          {conflict && conflict.names.length > 1 && (
            <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg bg-canvas p-2.5 text-sm">
              {conflict.names.map((n) => (
                <li key={n} className="truncate">{n}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            {(["replace", "keep", "skip"] as const).map((c) => (
              <Button
                key={c}
                variant={c === "replace" ? "default" : c === "keep" ? "outline" : "ghost"}
                onClick={() => {
                  conflict?.resolve(c);
                  setConflict(null);
                }}
              >
                {c === "replace" ? "Nouvelle version" : c === "keep" ? "Garder les deux" : "Ignorer"}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </UploadContext.Provider>
  );
}
