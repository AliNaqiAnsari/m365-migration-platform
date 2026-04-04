"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { ROUTES } from "@/lib/utils/constants";
import { formatRelativeTime } from "@/lib/utils/format";
import type { DashboardStats } from "@/lib/api/dashboard";

interface ActiveMigrationsProps {
  jobs: DashboardStats["recentJobs"];
}

export function ActiveMigrations({ jobs }: ActiveMigrationsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Migrations</CardTitle>
          <Link
            href={ROUTES.MIGRATIONS}
            className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No migrations yet</p>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={ROUTES.MIGRATION_DETAIL(job.id)}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate mr-2">{job.name}</span>
                  <StatusBadge status={job.status} />
                </div>
                <Progress value={job.progressPercent} className="h-1.5" />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {job.progressPercent}% complete
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(job.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
