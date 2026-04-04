"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";
import { getSubscription, getUsage, createCustomerPortal } from "@/lib/api/billing";
import { QUERY_KEYS } from "@/lib/utils/constants";
import { formatBytes } from "@/lib/utils/format";
import { PLAN_LIMITS, type PlanTier } from "@m365-migration/types";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const PLAN_DISPLAY: Record<string, { name: string; color: string }> = {
  FREE: { name: "Free", color: "bg-muted text-muted-foreground" },
  STARTER: { name: "Starter", color: "bg-info/10 text-info" },
  PROFESSIONAL: { name: "Professional", color: "bg-brand-100 text-brand-700" },
  ENTERPRISE: { name: "Enterprise", color: "bg-brand text-white" },
};

export default function BillingPage() {
  const { data: sub, isLoading: subLoading } = useQuery({ queryKey: QUERY_KEYS.SUBSCRIPTION, queryFn: getSubscription });
  const { data: usage, isLoading: usageLoading } = useQuery({ queryKey: QUERY_KEYS.USAGE, queryFn: getUsage });

  const portalMut = useMutation({
    mutationFn: createCustomerPortal,
    onSuccess: (data) => { window.open(data.url, "_blank"); },
    onError: (err: any) => toast.error(err.message),
  });

  const planLimits = sub ? PLAN_LIMITS[sub.plan as PlanTier] : null;
  const planDisplay = sub ? PLAN_DISPLAY[sub.plan] || PLAN_DISPLAY.FREE : null;

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Billing" description="Manage your subscription and usage">
        <Button variant="outline" onClick={() => portalMut.mutate()} disabled={portalMut.isPending}>
          <ExternalLink className="h-4 w-4" />
          Stripe Portal
        </Button>
      </PageHeader>

      {subLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : sub ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Current Plan</CardTitle>
                <CardDescription>
                  {sub.cancelAtPeriodEnd ? "Cancels at end of period" : `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                </CardDescription>
              </div>
              <Badge className={planDisplay?.color}>{planDisplay?.name}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Tenants</p>
                <p className="font-semibold">{planLimits?.maxTenants === -1 ? "Unlimited" : planLimits?.maxTenants}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Concurrent Jobs</p>
                <p className="font-semibold">{planLimits?.maxConcurrentJobs === -1 ? "Unlimited" : planLimits?.maxConcurrentJobs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data / Month</p>
                <p className="font-semibold">{planLimits?.maxDataPerMonthBytes === -1 ? "Unlimited" : formatBytes(planLimits?.maxDataPerMonthBytes ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Users</p>
                <p className="font-semibold">{planLimits?.maxUsers === -1 ? "Unlimited" : planLimits?.maxUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {usageLoading ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : usage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-warning" />
              Current Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                label: "Data Migrated",
                current: parseInt(usage.dataMigratedBytes),
                limit: usage.limits.maxDataPerMonthBytes,
                format: formatBytes,
              },
              {
                label: "Items Migrated",
                current: usage.itemsMigrated,
                limit: -1,
                format: (v: number) => v.toLocaleString(),
              },
              {
                label: "API Calls",
                current: usage.apiCalls,
                limit: -1,
                format: (v: number) => v.toLocaleString(),
              },
            ].map((meter) => (
              <div key={meter.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{meter.label}</span>
                  <span className="text-sm font-medium tabular-nums">
                    {meter.format(meter.current)}
                    {meter.limit > 0 && ` / ${meter.format(meter.limit)}`}
                  </span>
                </div>
                {meter.limit > 0 && (
                  <Progress value={(meter.current / meter.limit) * 100} className="h-2" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
