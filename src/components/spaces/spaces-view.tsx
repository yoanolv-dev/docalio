import Link from "next/link";
import { Inbox, Plus, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionList } from "@/components/home/action-list";
import { SpacesList } from "@/components/spaces/spaces-list";
import { QuickCreateDialog } from "@/components/spaces/quick-create-dialog";
import type { WorkspaceListItem } from "@/lib/workspaces";
import type { ActionItem } from "@/lib/action-items";
import type { Vocabulary } from "@/lib/sectors";

/**
 * Page d'accueil de l'application = la liste des espaces. En tête, uniquement
 * s'il y en a : ce qui attend une réaction. Rien d'autre.
 */
export function SpacesView({
  workspaces,
  actions,
  vocab,
  template,
  nameExample,
  internal,
  canCreateInternal,
  openCreate = false,
}: {
  workspaces: WorkspaceListItem[];
  actions: ActionItem[];
  vocab: Vocabulary;
  template: string[];
  nameExample: string;
  internal: boolean;
  canCreateInternal: boolean;
  openCreate?: boolean;
}) {
  const newButton = (
    <Button className="h-10 rounded-xl px-4 shadow-[0_1px_2px_rgba(37,99,235,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
      <Plus className="h-4 w-4" />
      {vocab.newLabel}
    </Button>
  );
  const create = (
    <QuickCreateDialog trigger={newButton} template={template} nameExample={nameExample} internal={internal} defaultOpen={openCreate} />
  );

  // Premier lancement : une seule chose à faire.
  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center sm:py-16">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          {internal ? "Créez votre premier espace" : "Ajoutez votre premier client"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          {internal
            ? "Un espace pour ranger et partager des documents avec votre équipe."
            : "Indiquez son nom : vous obtenez un lien sécurisé à lui envoyer. Il y dépose ses pièces et consulte vos documents, sans créer de compte."}
        </p>
        <div className="mt-8 flex justify-center">
          <QuickCreateDialog
            trigger={
              <Button size="lg" className="h-12 rounded-xl px-6 text-base">
                <Plus className="h-5 w-5" />
                {vocab.newLabel}
              </Button>
            }
            template={template}
            nameExample={nameExample}
            internal={internal}
            defaultOpen={openCreate}
          />
        </div>
        {!internal && (
          <ol className="mx-auto mt-12 grid max-w-md gap-3 text-left text-sm">
            {[
              { icon: Plus, t: "Vous créez l'espace du client", d: "Nom et pièces à demander, c'est tout." },
              { icon: Send, t: "Vous lui envoyez le lien", d: "Par e-mail, en un clic." },
              { icon: Inbox, t: "Il dépose, vous validez", d: "Vous êtes prévenu à chaque dépôt." },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.t} className="flex items-start gap-3 rounded-xl bg-white p-3.5 ring-1 ring-border">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-medium">{i + 1}. {s.t}</span>
                    <span className="block text-muted-foreground">{s.d}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{vocab.listTitle}</h1>
        {create}
      </div>

      {actions.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <header className="flex items-center gap-2 border-b border-border px-5 py-3">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold">À traiter</h2>
            <span className="text-sm text-muted-foreground">· {actions.length}</span>
          </header>
          <ActionList items={actions} />
        </section>
      )}

      <SpacesList workspaces={workspaces} singular={vocab.singular} />

      {canCreateInternal && (
        <p className="text-center text-xs text-muted-foreground">
          Besoin d&apos;un espace réservé à votre équipe ?{" "}
          <Link href="/dashboard/workspaces/new" className="font-medium text-foreground underline-offset-4 hover:underline">
            Créer un espace interne
          </Link>
        </p>
      )}
    </div>
  );
}
