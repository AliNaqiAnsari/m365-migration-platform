"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, ArrowRightLeft } from "lucide-react";
import { listMigrations } from "@/lib/api/migrations";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { formatRelativeTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { WORKLOAD_META } from "@/lib/utils/workloads";
import type { WorkloadType } from "@m365-migration/types";

export default function MigrationsPage() {
  const router = useRouter();
  const { data: migrations, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MIGRATIONS,
    queryFn: () => listMigrations(),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Migrations" description="Manage your migration jobs">
        <Button variant="brand" onClick={() => router.push(ROUTES.MIGRATION_NEW)}>
          <Plus className="h-4 w-4" />
          New Migration
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !migrations?.length ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No migrations yet"
          description="Create your first migration job to start moving data between tenants."
          action={{ label: "New Migration", onClick: () => router.push(ROUTES.MIGRATION_NEW) }}
        />
      ) : (
        <div className="space-y-3">
          {migrations.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-brand/30"
              onClick={() => router.push(ROUTES.MIGRATION_DETAIL(job.id))}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium">{job.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {job.workloads.map((w) => (
                        <Badge key={w} variant="secondary" className="text-[10px]">
                          {WORKLOAD_META[w as WorkloadType]?.label || w}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <Progress value={job.progressPercent} className="h-1.5 mb-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {job.processedItems.toLocaleString()} / {job.totalItems.toLocaleString()} items
                    &middot; {job.progressPercent}%
                  </span>
                  <span>{formatRelativeTime(job.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
