"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Server } from "lucide-react";
import { listTenants } from "@/lib/api/tenants";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PROVIDER_LABELS, CONNECTION_TYPE_LABELS } from "@/lib/utils/workloads";
import { formatRelativeTime, formatBytes } from "@/lib/utils/format";

export default function TenantsPage() {
  const router = useRouter();
  const { data: tenants, isLoading } = useQuery({
    queryKey: QUERY_KEYS.TENANTS,
    queryFn: () => listTenants(),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Tenants" description="Manage connected Microsoft 365 and Google Workspace tenants">
        <Button variant="brand" onClick={() => router.push(ROUTES.TENANT_CONNECT)}>
          <Plus className="h-4 w-4" />
          Connect Tenant
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : !tenants?.length ? (
        <EmptyState
          icon={Server}
          title="No tenants connected"
          description="Connect your first Microsoft 365 or Google Workspace tenant to start migrating."
          action={{ label: "Connect Tenant", onClick: () => router.push(ROUTES.TENANT_CONNECT) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card
              key={tenant.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-brand/30"
              onClick={() => router.push(ROUTES.TENANT_DETAIL(tenant.id))}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/30">
                      <Server className="h-4 w-4 text-brand" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.domain}</p>
                    </div>
                  </div>
                  <StatusBadge status={tenant.status} />
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Provider</span>
                    <span className="font-medium text-foreground">
                      {PROVIDER_LABELS[tenant.provider] || tenant.provider}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="font-medium text-foreground">
                      {CONNECTION_TYPE_LABELS[tenant.connectionType] || tenant.connectionType}
                    </span>
                  </div>
                  {tenant.userCount !== undefined && (
                    <div className="flex justify-between">
                      <span>Users</span>
                      <span className="font-medium text-foreground">{tenant.userCount}</span>
                    </div>
                  )}
                  {tenant.storageUsedBytes && (
                    <div className="flex justify-between">
                      <span>Storage</span>
                      <span className="font-medium text-foreground">{formatBytes(tenant.storageUsedBytes)}</span>
                    </div>
                  )}
                  {tenant.lastSyncAt && (
                    <div className="flex justify-between">
                      <span>Last sync</span>
                      <span>{formatRelativeTime(tenant.lastSyncAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
