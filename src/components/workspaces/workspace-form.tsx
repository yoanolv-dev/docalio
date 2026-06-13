"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LogoUploader } from "@/components/settings/logo-uploader";
import { WORKSPACE_STATUS_OPTIONS } from "@/components/workspaces/workspace-status-badge";
import type { WorkspaceFormState } from "@/lib/actions/workspaces";
import type { Workspace } from "@/lib/types/database";

export function WorkspaceForm({
  action,
  workspace,
  submitLabel,
}: {
  action: (
    prev: WorkspaceFormState,
    formData: FormData
  ) => Promise<WorkspaceFormState>;
  workspace?: Workspace;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<
    WorkspaceFormState,
    FormData
  >(action, null);

  const [slug, setSlug] = useState(workspace?.slug ?? "");
  const portalDomain =
    process.env.NEXT_PUBLIC_PORTAL_DOMAIN || "docalio.app";

  return (
    <form action={formAction} className="space-y-4">
      {workspace && (
        <input type="hidden" name="workspace_id" value={workspace.id} />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="name">Nom de l&apos;espace</Label>
        <Input
          id="name"
          name="name"
          placeholder="Garage Martin"
          defaultValue={workspace?.name ?? ""}
          required
          autoFocus
        />
      </div>

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

      {/* Personnalisation de l'espace client (sous-domaine, logo, couleur) */}
      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium">Personnalisation de l&apos;espace</p>

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

      <div className="space-y-1.5">
        <Label htmlFor="internal_note">Note interne</Label>
        <Textarea
          id="internal_note"
          name="internal_note"
          placeholder="Visible uniquement par votre équipe."
          defaultValue={workspace?.internal_note ?? ""}
        />
      </div>

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
