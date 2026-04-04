"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Unplug, RefreshCw, Server } from "lucide-react";
import { toast } from "sonner";
import { getTenant, disconnectTenant, deleteTenant } from "@/lib/api/tenants";
import { triggerDiscovery, getDiscoveryResults } from "@/lib/api/discovery";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { WORKLOAD_LIST, PROVIDER_LABELS, CONNECTION_TYPE_LABELS } from "@/lib/utils/workloads";
import { formatBytes, formatRelativeTime, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useState } from "react";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: QUERY_KEYS.TENANT(id),
    queryFn: () => getTenant(id),
  });

  const { data: discovery } = useQuery({
    queryKey: QUERY_KEYS.DISCOVERY(id),
    queryFn: () => getDiscoveryResults(id),
    enabled: !!tenant,
  });

  const discoverMutation = useMutation({
    mutationFn: () => triggerDiscovery(id, WORKLOAD_LIST),
    onSuccess: () => {
      toast.success("Discovery started");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DISCOVERY(id) });
    },
    onError: (err: any) => toast.error(err.message || "Discovery failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANTS });
      toast.success("Tenant deleted");
      router.push(ROUTES.TENANTS);
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title={tenant.name} description={tenant.domain}>
        <Button variant="ghost" onClick={() => router.push(ROUTES.TENANTS)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" onClick={() => discoverMutation.mutate()} disabled={discoverMutation.isPending}>
          <RefreshCw className={`h-4 w-4 ${discoverMutation.isPending ? "animate-spin" : ""}`} />
          Run Discovery
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Tenant Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={tenant.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-medium">{PROVIDER_LABELS[tenant.provider] || tenant.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{CONNECTION_TYPE_LABELS[tenant.connectionType]}</span>
            </div>
            {tenant.userCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Users</span>
                <span className="font-medium">{formatNumber(tenant.userCount)}</span>
              </div>
            )}
            {tenant.storageUsedBytes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">{formatBytes(tenant.storageUsedBytes)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected</span>
              <span>{formatRelativeTime(tenant.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Discovery Data</CardTitle>
          </CardHeader>
          <CardContent>
            {!discovery ? (
              <div className="flex flex-col items-center py-10 text-center">
                <Server className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No discovery data yet. Run discovery to scan this tenant.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Users", value: discovery.totals.users },
                    { label: "Groups", value: discovery.totals.groups },
                    { label: "Mailboxes", value: discovery.totals.mailboxes },
                    { label: "Sites", value: discovery.totals.sites },
                    { label: "Teams", value: discovery.totals.teams },
                    { label: "Drives", value: discovery.totals.drives },
                    { label: "Plans", value: discovery.totals.plans },
                    { label: "Total Size", value: formatBytes(discovery.totals.totalSizeBytes) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-semibold mt-0.5">
                        {typeof item.value === "number" ? formatNumber(item.value) : item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Tenant"
        description={`This will permanently remove "${tenant.name}" and all associated data. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
