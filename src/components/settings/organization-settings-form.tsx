"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateOrganizationAction,
  type FormState,
} from "@/lib/actions/organizations";
import { slugify } from "@/lib/slug";
import type { Organization } from "@/lib/types/database";

export function OrganizationSettingsForm({
  organization,
  canEdit,
}: {
  organization: Organization;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateOrganizationAction,
    null
  );

  const [slug, setSlug] = useState(organization.slug);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="organization_id" value={organization.id} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Nom de l&apos;organisation</Label>
        <Input
          id="name"
          name="name"
          defaultValue={organization.name}
          required
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Identifiant (slug)</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logo_url">URL du logo</Label>
        <Input
          id="logo_url"
          name="logo_url"
          type="url"
          placeholder="https://..."
          defaultValue={organization.logo_url ?? ""}
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="primary_color">Couleur principale</Label>
        <div className="flex items-center gap-3">
          <Input
            id="primary_color"
            name="primary_color"
            type="color"
            defaultValue={organization.primary_color ?? "#4f46e5"}
            className="h-9 w-14 cursor-pointer p-1"
            disabled={!canEdit}
          />
          <span className="text-xs text-muted-foreground">
            {organization.primary_color ?? "Non définie"}
          </span>
        </div>
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

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Seuls les administrateurs peuvent modifier ces paramètres.
        </p>
      )}
    </form>
  );
}
