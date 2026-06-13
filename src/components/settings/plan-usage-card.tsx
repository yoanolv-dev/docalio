import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsageMeter } from "@/components/settings/usage-meter";
import {
  formatCount,
  formatPlanPrice,
  formatStorage,
  resolvePlan,
} from "@/lib/plans";
import { formatBytes } from "@/lib/files";
import { formatDate } from "@/lib/utils";
import type { Organization, PlanStatus } from "@/lib/types/database";
import type { OrganizationUsage } from "@/lib/usage";

const STATUS_META: Record<
  PlanStatus,
  { label: string; variant: "info" | "success" | "destructive" }
> = {
  trial: { label: "Essai gratuit", variant: "info" },
  active: { label: "Abonnement actif", variant: "success" },
  suspended: { label: "Suspendu", variant: "destructive" },
};

export function PlanUsageCard({
  organization,
  usage,
}: {
  organization: Organization;
  usage: OrganizationUsage;
}) {
  const plan = resolvePlan(organization);
  const status: PlanStatus = organization.plan_status ?? "active";
  const statusMeta = STATUS_META[status] ?? STATUS_META.active;
  const limits = plan.limits;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Plan & utilisation
            </CardTitle>
            <CardDescription>
              Suivez votre consommation par rapport aux limites de votre plan.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <Badge>{plan.name}</Badge>
              <Badge variant={statusMeta.variant} dot>
                {statusMeta.label}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatPlanPrice(plan)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {status === "trial" && organization.trial_ends_at && (
          <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            Période d&apos;essai jusqu&apos;au{" "}
            {formatDate(organization.trial_ends_at)}.
          </p>
        )}

        <UsageMeter
          label="Stockage"
          used={usage.storageUsed}
          limit={limits.storageBytes}
          usedLabel={formatBytes(usage.storageUsed)}
          limitLabel={formatStorage(limits.storageBytes)}
        />
        <UsageMeter
          label="Espaces actifs"
          used={usage.activeWorkspaces}
          limit={limits.activeWorkspaces}
          usedLabel={String(usage.activeWorkspaces)}
          limitLabel={formatCount(limits.activeWorkspaces)}
        />
        <UsageMeter
          label="Utilisateurs (sièges)"
          used={usage.members}
          limit={limits.users}
          usedLabel={String(usage.members)}
          limitLabel={formatCount(limits.users)}
        />

        <p className="text-xs text-muted-foreground">
          Taille maximale par fichier : {formatStorage(limits.maxFileBytes)}.
          Les destinataires externes (portail client) sont illimités et gratuits.
        </p>
      </CardContent>
    </Card>
  );
}
