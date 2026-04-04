"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getRecentActivity } from "@/lib/api/dashboard";
import { QUERY_KEYS } from "@/lib/utils/constants";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ActiveMigrations } from "@/components/dashboard/active-migrations";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_STATS,
    queryFn: getDashboardStats,
  });

  const { data: activities, isLoading: activityLoading } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_ACTIVITY,
    queryFn: getRecentActivity,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your migration operations" />

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <StatsCards stats={stats} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {statsLoading ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : stats ? (
          <ActiveMigrations jobs={stats.recentJobs} />
        ) : null}

        {activityLoading ? (
          <Skeleton className="h-80 rounded-xl" />
        ) : (
          <RecentActivity activities={activities ?? []} />
        )}
      </div>
    </div>
  );
}
