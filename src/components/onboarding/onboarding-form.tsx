"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganizationAction,
  type FormState,
} from "@/lib/actions/organizations";
import { slugify } from "@/lib/slug";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createOrganizationAction,
    null
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom de l&apos;organisation</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme Inc."
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Identifiant (slug)</Label>
        <Input
          id="slug"
          name="slug"
          placeholder="acme-inc"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(slugify(e.target.value));
          }}
        />
        <p className="text-xs text-muted-foreground">
          Généré à partir du nom. Utilisé dans les URLs, modifiable.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="primary_color">Couleur principale (optionnel)</Label>
        <div className="flex items-center gap-3">
          <Input
            id="primary_color"
            name="primary_color"
            type="color"
            defaultValue="#4f46e5"
            className="h-9 w-14 cursor-pointer p-1"
          />
          <span className="text-xs text-muted-foreground">
            Sert à personnaliser votre espace.
          </span>
        </div>
      </div>

      {state && !state.ok && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Création..." : "Créer mon organisation"}
      </Button>
    </form>
  );
}
