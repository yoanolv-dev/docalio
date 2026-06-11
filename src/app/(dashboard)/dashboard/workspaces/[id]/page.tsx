import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Trash2,
  FileText,
  Activity,
  CheckCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { WorkspaceForm } from "@/components/workspaces/workspace-form";
import { WorkspaceStatusBadge } from "@/components/workspaces/workspace-status-badge";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import {
  updateWorkspaceAction,
  archiveWorkspaceAction,
  deleteWorkspaceAction,
} from "@/lib/actions/workspaces";
import { getWorkspace } from "@/lib/workspaces";
import { listWorkspaceDocuments } from "@/lib/documents";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Espace client",
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

const PLACEHOLDER_SECTIONS = [
  {
    icon: Activity,
    title: "Activité",
    description: "Bientôt : historique des actions de l'espace.",
  },
  {
    icon: CheckCircle,
    title: "Validation",
    description: "Bientôt : demandes et suivi de validation client.",
  },
];

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getWorkspace(id);
  if (!workspace) notFound();

  const documents = await listWorkspaceDocuments(workspace.id);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="space-y-4">
        <Link
          href="/dashboard/workspaces"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Espaces clients
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor:
                  workspace.primary_color ?? "var(--color-primary)",
              }}
            >
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {workspace.name}
                </h1>
                <WorkspaceStatusBadge status={workspace.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {workspace.client_company ?? "Espace client"} · Créé le{" "}
                {formatDate(workspace.created_at)}
              </p>
            </div>
          </div>

          {workspace.status !== "archived" && (
            <form action={archiveWorkspaceAction}>
              <input type="hidden" name="workspace_id" value={workspace.id} />
              <Button type="submit" variant="outline" size="sm">
                <Archive className="h-4 w-4" />
                Archiver
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>
                    Documents
                    {documents.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {documents.length}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Fichiers partagés dans cet espace client.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DocumentUploadForm workspaceId={workspace.id} />
              {documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Aucun document"
                  description="Ajoutez votre premier document : devis, rapport, contrat ou tout fichier utile à ce client."
                />
              ) : (
                <DocumentList
                  documents={documents}
                  workspaceId={workspace.id}
                />
              )}
            </CardContent>
          </Card>

          {/* Informations */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border pt-0">
              <InfoRow label="Société cliente" value={workspace.client_company} />
              <InfoRow label="Email" value={workspace.client_email} />
              <InfoRow label="Téléphone" value={workspace.client_phone} />
              <InfoRow label="Note interne" value={workspace.internal_note} />
            </CardContent>
          </Card>

          {/* Modification */}
          <Card>
            <CardHeader>
              <CardTitle>Modifier l&apos;espace</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkspaceForm
                action={updateWorkspaceAction}
                workspace={workspace}
                submitLabel="Enregistrer les modifications"
              />
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {PLACEHOLDER_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="opacity-70">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle>{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}

          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle>Zone de danger</CardTitle>
              <CardDescription>
                La suppression est définitive : l&apos;espace et ses documents
                seront perdus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={deleteWorkspaceAction}>
                <input type="hidden" name="workspace_id" value={workspace.id} />
                <Button type="submit" variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                  Supprimer l&apos;espace
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
