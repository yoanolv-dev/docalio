import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { getWorkspaceStats } from "@/lib/workspaces";
import { getDocumentStats } from "@/lib/documents";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  FileText,
  CheckCircle,
  Archive,
  Plus,
  Building2,
  FileStack,
  Eye,
  PenLine,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");

  const [stats, docStats] = await Promise.all([
    getWorkspaceStats(),
    getDocumentStats(),
  ]);
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "là";
  const { organization, role } = membership;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Bonjour, ${firstName} 👋`}
        description="Voici un aperçu de votre activité documentaire."
        action={
          <Button size="sm" asChild>
            <Link href="/dashboard/workspaces/new">
              <Plus className="h-4 w-4" />
              Nouvel espace client
            </Link>
          </Button>
        }
      />

      {/* Contexte organisation */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                backgroundColor:
                  organization.primary_color ?? "var(--color-primary)",
              }}
            >
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{organization.name}</p>
              <p className="text-xs text-muted-foreground">
                /{organization.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
            <Badge variant="success">Sprint 5 prêt</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats workspaces */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Espaces clients" value={stats.total} icon={Users} />
        <StatCard label="Prospects" value={stats.prospect} icon={FileText} />
        <StatCard label="Actifs" value={stats.active} icon={CheckCircle} />
        <StatCard label="Archivés" value={stats.archived} icon={Archive} />
      </div>

      {/* Stats documents */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Documents" value={docStats.total} icon={FileStack} />
        <StatCard label="Brouillons" value={docStats.draft} icon={PenLine} />
        <StatCard
          label="Visibles client"
          value={docStats.visibleToClient}
          icon={Eye}
        />
      </div>

      {/* Activité récente — placeholder */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Activité récente
        </h2>
        <EmptyState
          icon={FileText}
          title="Aucune activité pour le moment"
          description="Créez votre premier espace client pour commencer à centraliser vos informations."
          action={
            <Button size="sm" asChild>
              <Link href="/dashboard/workspaces/new">
                <Plus className="h-4 w-4" />
                Créer un espace client
              </Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
