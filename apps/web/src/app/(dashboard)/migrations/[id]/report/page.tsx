"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { getMigrationReport } from "@/lib/api/migrations";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { WORKLOAD_META } from "@/lib/utils/workloads";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { WorkloadType } from "@m365-migration/types";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: report, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MIGRATION_REPORT(id),
    queryFn: () => getMigrationReport(id),
  });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  if (!report) {
    return (
      <div className="space-y-6">
        <Breadcrumbs />
        <EmptyState
          icon={FileText}
          title="No report available"
          description="The migration report will be available once the migration completes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Migration Report" description={report.jobName}>
        <Button variant="ghost" onClick={() => router.push(ROUTES.MIGRATION_DETAIL(id))}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={report.status} />
          </div>
          {report.duration && (
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{report.duration}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5 border-b">
            <span className="text-muted-foreground">Total Errors</span>
            <span className={report.errors.total > 0 ? "text-destructive font-medium" : ""}>
              {report.errors.total}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-muted-foreground">Dead Letter Items</span>
            <span>{report.deadLetterCount}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workload Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Workload</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Items</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Failed</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Size</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.workloads.map((w) => (
                  <tr key={w.workload} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {WORKLOAD_META[w.workload as WorkloadType]?.label || w.workload}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {w.processedItems.toLocaleString()} / {w.totalItems.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={w.failedItems > 0 ? "text-destructive" : ""}>
                        {w.failedItems.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBytes(w.processedBytes)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={w.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {report.errors.topErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Errors</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {report.errors.topErrors.map((err, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono truncate">{err.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{err.message}</p>
                  </div>
                  <Badge variant="destructive" className="ml-3 shrink-0">{err.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
