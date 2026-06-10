import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Users, FileText, CheckCircle, Clock, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "là";

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={`Bonjour, ${firstName} 👋`}
        description="Voici un aperçu de votre activité documentaire."
        action={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nouvel espace client
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Espaces clients"
          value={0}
          icon={Users}
        />
        <StatCard
          label="Documents partagés"
          value={0}
          icon={FileText}
        />
        <StatCard
          label="Validations reçues"
          value={0}
          icon={CheckCircle}
        />
        <StatCard
          label="En attente"
          value={0}
          icon={Clock}
        />
      </div>

      {/* Empty state — activité récente */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[--color-muted-foreground] uppercase tracking-wide">
          Activité récente
        </h2>
        <EmptyState
          icon={FileText}
          title="Aucune activité pour le moment"
          description="Créez votre premier espace client pour commencer à partager des documents."
          action={
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Créer un espace client
            </Button>
          }
        />
      </div>
    </div>
  );
}
