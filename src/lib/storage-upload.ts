"use client";

import * as tus from "tus-js-client";

// =============================================================================
// Dépôt direct d'un fichier dans le bucket privé, depuis le navigateur.
// - Petits fichiers : un seul envoi (XHR, avec progression).
// - Au-delà de 6 Mo : envoi « reprenable » par morceaux (protocole tus), qui
//   survit aux coupures réseau.
// Le jeton d'accès est celui de l'utilisateur (ou la clé publique pour un
// visiteur anonyme) : les policies Storage décident, rien n'est contourné.
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = "documents";
const CHUNK = 6 * 1024 * 1024;

export interface UploadHandle {
  promise: Promise<void>;
  abort: () => void;
}

export class UploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function friendlyStatus(status: number | undefined): string {
  if (status === 413) return "Fichier trop volumineux pour l'hébergement actuel.";
  if (status === 401 || status === 403) return "Envoi refusé : vérifiez vos droits sur cet espace.";
  if (status === 409) return "Un fichier existe déjà à cet emplacement.";
  return "L'envoi a échoué. Vérifiez votre connexion et réessayez.";
}

/**
 * Dépose `file` à `path` dans le bucket privé. `accessToken` : jeton de
 * session de l'utilisateur, ou null pour un visiteur anonyme (lien de dépôt).
 */
export function uploadToStorage(
  file: File,
  path: string,
  accessToken: string | null,
  onProgress: (fraction: number) => void
): UploadHandle {
  const bearer = accessToken ?? ANON_KEY;
  const contentType = file.type || "application/octet-stream";

  if (file.size <= CHUNK) {
    const xhr = new XMLHttpRequest();
    const promise = new Promise<void>((resolve, reject) => {
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`);
      xhr.setRequestHeader("authorization", `Bearer ${bearer}`);
      xhr.setRequestHeader("apikey", ANON_KEY);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("content-type", contentType);
      xhr.setRequestHeader("cache-control", "max-age=3600");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(1);
          resolve();
        } else {
          reject(new UploadError(friendlyStatus(xhr.status), xhr.status));
        }
      };
      xhr.onerror = () => reject(new UploadError(friendlyStatus(undefined)));
      xhr.onabort = () => reject(new UploadError("Envoi annulé.", 0));
      xhr.send(file);
    });
    return { promise, abort: () => xhr.abort() };
  }

  let upload: tus.Upload | null = null;
  let aborted = false;
  let rejectUpload: (reason: UploadError) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    rejectUpload = reject;
    upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 2000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${bearer}`,
        apikey: ANON_KEY,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK,
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType,
        cacheControl: "3600",
      },
      onError: (err) => {
        if (aborted) return reject(new UploadError("Envoi annulé.", 0));
        const status = (err as tus.DetailedError).originalResponse?.getStatus();
        reject(new UploadError(friendlyStatus(status), status));
      },
      onProgress: (sent, total) => onProgress(total ? sent / total : 0),
      onSuccess: () => {
        onProgress(1);
        resolve();
      },
    });
    upload.findPreviousUploads().then((previous) => {
      if (previous.length && upload) upload.resumeFromPreviousUpload(previous[0]);
      upload?.start();
    });
  });

  return {
    promise,
    abort: () => {
      if (aborted) return;
      aborted = true;
      const u = upload as tus.Upload | null;
      if (u) void u.abort(true);
      rejectUpload(new UploadError("Envoi annulé.", 0));
    },
  };
}
