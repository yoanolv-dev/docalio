"use client";

import { useActionState, useState } from "react";
import { Building2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { WORKSPACE_STATUS_OPTIONS } from "@/components/workspaces/workspace-status-badge";
import type { WorkspaceFormState } from "@/lib/actions/workspaces";
import {
  canChooseSpaceType,
  defaultSpaceType,
  getSector,
} from "@/lib/sectors";
import { cn } from "@/lib/utils";
import type { SpaceType, UsageType, Workspace } from "@/lib/types/database";

export function WorkspaceForm({
  action,
  workspace,
  submitLabel,
  usageType,
  sector,
}: {
  action: (
    prev: WorkspaceFormState,
    formData: FormData
  ) => Promise<WorkspaceFormState>;
  workspace?: Workspace;
  submitLabel: string;
  usageType?: UsageType | null;
  sector?: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    WorkspaceFormState,
    FormData
  >(action, null);

  const sectorDef = getSector(sector);
  const isNew = !workspace;
  const showTypeChoice = canChooseSpaceType(usageType);

  const [spaceType, setSpaceType] = useState<SpaceType>(
    workspace?.space_type ?? defaultSpaceType(usageType)
  );
  const isExternal = spaceType === "external";

  const [slug, setSlug] = useState(workspace?.slug ?? "");
  const [seedFolders, setSeedFolders] = useState(isNew);
  const portalDomain = process.env.NEXT_PUBLIC_PORTAL_DOMAIN || "docalio.app";

  return (
    <form action={formAction} className="space-y-4">
      {workspace && (
        <input type="hidden" name="workspace_id" value={workspace.id} />
      )}
      <input type="hidden" name="space_type" value={spaceType} />

      {/* Type d'espace — uniquement si l'organisation mêle interne & externe */}
      {showTypeChoice && (
        <div className="space-y-1.5">
          <Label>Type d&apos;espace</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <TypeChoice
              active={spaceType === "internal"}
              icon={<Lock className="h-4 w-4" />}
              title="Interne"
              hint="Pour votre équipe"
              onClick={() => setSpaceType("internal")}
            />
            <TypeChoice
              active={spaceType === "external"}
              icon={<Building2 className="h-4 w-4" />}
              title="Client / externe"
              hint="Partagé via un lien"
              onClick={() => setSpaceType("external")}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Nom de l&apos;espace</Label>
        <Input
          id="name"
          name="name"
          placeholder={sectorDef.nameExample}
          defaultValue={workspace?.name ?? ""}
          required
          autoFocus
        />
      </div>

      {/* Champs « client » : pertinents uniquement pour un espace externe */}
      {isExternal ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="client_company">Société cliente</Label>
              <Input
                id="client_company"
                name="client_company"
                placeholder="Martin SAS"
                defaultValue={workspace?.client_company ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Statut</Label>
              <Select
                id="status"
                name="status"
                defaultValue={workspace?.status ?? "prospect"}
              >
                {WORKSPACE_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="client_email">Email client</Label>
              <Input
                id="client_email"
                name="client_email"
                type="email"
                placeholder="contact@martin.fr"
                defaultValue={workspace?.client_email ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_phone">Téléphone client</Label>
              <Input
                id="client_phone"
                name="client_phone"
                type="tel"
                placeholder="06 12 34 56 78"
                defaultValue={workspace?.client_phone ?? ""}
              />
            </div>
          </div>

          {/* Personnalisation du portail (sous-domaine, logo, couleur) */}
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">
              Personnalisation du portail client
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Sous-domaine (optionnel)</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="boulangerie-margot"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Adresse du portail :{" "}
                <span className="font-medium text-foreground">
                  {(slug.trim() || "votre-client").toLowerCase()}.{portalDomain}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Logo de l&apos;espace</Label>
              <LogoUploader
                scope={workspace?.id ?? "new"}
                defaultValue={workspace?.logo_url}
                hint="Affiché en tête du portail client. PNG, JPG ou WebP — 2 Mo max."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="primary_color">Couleur principale</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primary_color"
                  name="primary_color"
                  type="color"
                  defaultValue={workspace?.primary_color ?? "#2563eb"}
                  className="h-9 w-14 cursor-pointer p-1"
                />
                <span className="text-xs text-muted-foreground">
                  Couleur de marque du portail client.
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Espace interne : on conserve le statut côté serveur sans l'exposer
        // (les notions « prospect » n'ont pas de sens en interne).
        <input
          type="hidden"
          name="status"
          value={workspace?.status === "archived" ? "archived" : "active"}
        />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="internal_note">Note interne</Label>
        <Textarea
          id="internal_note"
          name="internal_note"
          placeholder="Visible uniquement par votre équipe."
          defaultValue={workspace?.internal_note ?? ""}
        />
      </div>

      {/* Modèle de dossiers — à la création uniquement */}
      {isNew && sectorDef.folderTemplate.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={seedFolders}
              onChange={(e) => setSeedFolders(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-medium">
                Pré-créer les dossiers du modèle « {sectorDef.label} »
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {sectorDef.folderTemplate.join(" · ")}
              </span>
            </span>
          </label>
          {seedFolders && (
            <input
              type="hidden"
              name="folders"
              value={sectorDef.folderTemplate.join("|")}
            />
          )}
        </div>
      )}

      {state?.message && (
        <p
          className={
            state.ok
              ? "rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              : "rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
          }
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : submitLabel}
      </Button>
    </form>
  );
}

function TypeChoice({
  active,
  icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary-subtle ring-1 ring-primary"
          : "border-border hover:border-ring/50 hover:bg-accent/50"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
