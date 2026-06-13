"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, LoaderCircle, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadBrandLogoAction } from "@/lib/actions/branding";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Upload de logo intégré (remplace le collage d'URL). Le fichier part dans le
 * bucket public `brand` via une server action ; l'URL publique obtenue est
 * placée dans un input caché `name` que le formulaire parent enregistre tel
 * quel (la sémantique « logo_url = une URL » est conservée).
 */
export function LogoUploader({
  name = "logo_url",
  scope,
  defaultValue,
  disabled,
  hint,
}: {
  name?: string;
  scope: string;
  defaultValue?: string | null;
  disabled?: boolean;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startUpload] = useTransition();

  function pick() {
    if (disabled || pending) return;
    inputRef.current?.click();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Format accepté : PNG, JPG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image trop lourde (2 Mo maximum).");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("scope", scope);
    if (url) fd.set("previous_url", url);
    startUpload(async () => {
      const r = await uploadBrandLogoAction(fd);
      if (r.ok) setUrl(r.url);
      else setError(r.message);
    });
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} readOnly />
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={pick}
          disabled={disabled || pending}
          aria-label="Téléverser un logo"
          className={cn(
            "group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 transition-colors",
            !disabled && "hover:border-ring/60 hover:bg-accent",
            (disabled || pending) && "cursor-default opacity-80"
          )}
        >
          {pending ? (
            <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/60" />
          )}
        </button>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={pick}
              disabled={disabled || pending}
            >
              <ImageUp className="h-4 w-4" />
              {url ? "Remplacer" : "Téléverser un logo"}
            </Button>
            {url && !pending && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setUrl("");
                  setError(null);
                }}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
                Retirer
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {hint ?? "PNG, JPG ou WebP — 2 Mo maximum."}
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
