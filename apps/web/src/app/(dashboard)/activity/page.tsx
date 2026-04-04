"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { listActivityLogs } from "@/lib/api/activity-logs";
import { QUERY_KEYS } from "@/lib/utils/constants";
import { formatRelativeTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";

export default function ActivityPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ACTIVITY_LOGS,
    queryFn: () => listActivityLogs(),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Activity Log" description="Audit trail of all actions in your organization" />

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !logs?.length ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions will appear here as your team uses the platform." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.userName}</span>
                      <span className="text-sm text-muted-foreground">{log.description}</span>
                      {log.category && <Badge variant="secondary" className="text-[10px]">{log.category}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatRelativeTime(log.createdAt)}
                      {log.ipAddress && ` from ${log.ipAddress}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
