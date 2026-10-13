import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { File, UploadType } from "expo-file-system";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { BUCKET, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
import { dbMessage } from "./api";
import { cleanItemName, formatStoragePath, sanitizeFileName, uniqueFileName, validateDriveFile } from "./shared";

// =============================================================================
// Envois depuis le téléphone : dépôt direct dans le bucket privé (le fichier
// est lu sur le disque par le système, sans passer en mémoire JavaScript),
// puis enregistrement par la fonction SQL drive_register_upload (droits,
// quota et journal vérifiés par la base). Trois envois en parallèle.
// =============================================================================

export interface PickedFile {
  uri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
}

export interface UploadTarget {
  organizationId: string;
  workspaceId: string;
  folderId: string | null;
  /** Noms déjà présents dans le dossier (les doublons deviennent « Nom (1).ext »). */
  takenNames: string[];
  maxBytes: number;
}

export interface UploadItem {
  id: string;
  name: string;
  workspaceId: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  message?: string;
}

interface UploadsValue {
  items: UploadItem[];
  active: boolean;
  enqueue: (files: PickedFile[], target: UploadTarget) => void;
  clearFinished: () => void;
}

const UploadsContext = createContext<UploadsValue | null>(null);
const PARALLEL = 3;

async function putObject(file: PickedFile, path: string, onProgress: (p: number) => void): Promise<string | null> {
  const contentType = file.mimeType || "application/octet-stream";
  if (Platform.OS === "web") {
    const blob = await (await fetch(file.uri)).blob();
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: false });
    onProgress(1);
    return error ? error.message : null;
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Session expirée : reconnectez-vous.";
  const task = new File(file.uri).createUploadTask(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    httpMethod: "POST",
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      "content-type": contentType,
      "x-upsert": "false",
      "cache-control": "max-age=3600",
    },
    onProgress: ({ bytesSent, totalBytes }) => totalBytes > 0 && onProgress(bytesSent / totalBytes),
  });
  try {
    const res = await task.uploadAsync();
    if (res.status >= 200 && res.status < 300) return null;
    try {
      return (JSON.parse(res.body) as { message?: string }).message ?? `Erreur ${res.status}`;
    } catch {
      return `Erreur ${res.status}`;
    }
  } finally {
    task.release();
  }
}

function fileSize(file: PickedFile): number {
  if (file.size && file.size > 0) return file.size;
  if (Platform.OS === "web") return file.size ?? 0;
  try {
    return new File(file.uri).size;
  } catch {
    return 0;
  }
}

export function UploadsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const running = useRef(0);
  const queue = useRef<{ item: UploadItem; file: PickedFile; target: UploadTarget }[]>([]);

  const patch = useCallback((id: string, change: Partial<UploadItem>) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }, []);

  const runOne = useCallback(
    async (job: { item: UploadItem; file: PickedFile; target: UploadTarget }) => {
      const { item, file, target } = job;
      patch(item.id, { status: "uploading", progress: 0 });
      const size = fileSize(file);
      const invalid = validateDriveFile({ name: item.name, size }, target.maxBytes);
      if (invalid) return patch(item.id, { status: "error", message: invalid });

      const path = formatStoragePath(target.organizationId, target.workspaceId, Crypto.randomUUID(), sanitizeFileName(item.name));
      let lastTick = 0;
      const failure = await putObject(file, path, (p) => {
        const now = Date.now();
        if (now - lastTick > 120 || p >= 1) {
          lastTick = now;
          patch(item.id, { progress: Math.min(0.98, p) });
        }
      }).catch((e: unknown) => (e instanceof Error ? e.message : "Envoi interrompu."));
      if (failure) {
        const quota = /exceeded|too large|maximum/i.test(failure);
        return patch(item.id, {
          status: "error",
          message: quota ? "Fichier trop volumineux pour l'hébergement actuel." : "Envoi interrompu. Vérifiez votre connexion.",
        });
      }

      const { error } = await supabase.rpc("drive_register_upload", {
        p_workspace_id: target.workspaceId,
        p_folder_id: target.folderId,
        p_path: path,
        p_name: cleanItemName(item.name),
        p_type: file.mimeType,
        p_replace_document_id: null,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        return patch(item.id, { status: "error", message: dbMessage(error, "Enregistrement impossible. Réessayez.") });
      }
      // « Ajouté » seulement quand le fichier est visible dans la liste rafraîchie.
      await queryClient.invalidateQueries({ queryKey: ["listing", target.workspaceId] });
      patch(item.id, { status: "done", progress: 1 });
    },
    [patch, queryClient],
  );

  const pump = useCallback(function pumpQueue() {
    while (running.current < PARALLEL && queue.current.length) {
      const job = queue.current.shift()!;
      running.current += 1;
      runOne(job).finally(() => {
        running.current -= 1;
        if (running.current === 0 && queue.current.length === 0) {
          queryClient.invalidateQueries({ queryKey: ["spaces"] });
          queryClient.invalidateQueries({ queryKey: ["recents"] });
        }
        pumpQueue();
      });
    }
  }, [queryClient, runOne]);

  const enqueue = useCallback(
    (files: PickedFile[], target: UploadTarget) => {
      const taken = [...target.takenNames];
      const jobs = files.map((file) => {
        const name = uniqueFileName(cleanItemName(file.name) || "Fichier", taken);
        taken.push(name);
        const item: UploadItem = { id: Crypto.randomUUID(), name, workspaceId: target.workspaceId, progress: 0, status: "queued" };
        return { item, file, target };
      });
      setItems((list) => [...list.filter((i) => i.status !== "done"), ...jobs.map((j) => j.item)]);
      queue.current.push(...jobs);
      pump();
    },
    [pump],
  );

  const clearFinished = useCallback(() => {
    setItems((list) => list.filter((i) => i.status === "queued" || i.status === "uploading"));
  }, []);

  const value = useMemo(
    () => ({ items, active: items.some((i) => i.status === "queued" || i.status === "uploading"), enqueue, clearFinished }),
    [items, enqueue, clearFinished],
  );
  return <UploadsContext.Provider value={value}>{children}</UploadsContext.Provider>;
}

export function useUploads(): UploadsValue {
  const ctx = useContext(UploadsContext);
  if (!ctx) throw new Error("useUploads hors de UploadsProvider");
  return ctx;
}
