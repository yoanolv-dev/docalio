import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/organizations";
import { getWorkspaceStats } from "@/lib/workspaces";
import { getDocumentStats } from "@/lib/documents";
import { getRecentNotifications } from "@/lib/notifications";
import { getOnboardingProgress } from "@/lib/onboarding";
import { NotificationRow } from "@/components/notifications/notification-row";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { PageHeader } from "@/components/shared/page-header";
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
  FileStack,
  Eye,
  PenLine,
  ArrowRight,
  Bell,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Vue d'ensemble",
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

  const [stats, docStats, recentNotifications, onboarding] = await Promise.all([
    getWorkspaceStats(),
    getDocumentStats(),
    getRecentNotifications(6),
    getOnboardingProgress(),
  ]);
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "là";
  const { organization, role } = membership;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Bonjour, ${firstName}`}
        description="Voici un aperçu de votre activité documentaire."
        actions={
          <Button size="sm" asChild>
            <Link href="/dashboard/workspaces/new">
              <Plus className="h-4 w-4" />
              Nouvel espace client
            </Link>
          </Button>
        }
      />

      {/* Prise en main (jusqu'à ce que le parcours « première valeur » soit complet) */}
      {!onboarding.done && <OnboardingChecklist progress={onboarding} />}

      {/* Contexte organisation */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:pt-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground"
              style={{
                backgroundColor:
                  organization.primary_color ?? "var(--color-primary)",
              }}
            >
              {getInitials(organization.name)}
            </div>
            <div>
              <p className="text-sm font-semibold">{organization.name}</p>
              <p className="text-xs text-muted-foreground">
                docalio.app/{organization.slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/settings">
                Paramètres
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Espaces clients */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Espaces clients
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} icon={Users} tone="primary" />
          <StatCard label="Prospects" value={stats.prospect} icon={FileText} tone="warning" />
          <StatCard label="Actifs" value={stats.active} icon={CheckCircle} tone="success" />
          <StatCard label="Archivés" value={stats.archived} icon={Archive} />
        </div>
      </section>

      {/* Documents */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Documents</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={docStats.total} icon={FileStack} tone="primary" />
          <StatCard label="Brouillons" value={docStats.draft} icon={PenLine} />
          <StatCard label="Visibles client" value={docStats.visibleToClient} icon={Eye} tone="success" />
        </div>
      </section>

      {/* Activité récente */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Activité récente
          </h2>
          {recentNotifications.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/notifications">
                Tout voir
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        {recentNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Aucune activité pour le moment"
            description="Partagez un portail client : les ouvertures, téléchargements et décisions de vos clients apparaîtront ici en temps réel."
            action={
              <Button size="sm" asChild>
                <Link href="/dashboard/workspaces/new">
                  <Plus className="h-4 w-4" />
                  Créer un espace client
                </Link>
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-border p-1.5">
              {recentNotifications.map((n) => (
                <NotificationRow key={n.id} notification={n} compact />
              ))}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
