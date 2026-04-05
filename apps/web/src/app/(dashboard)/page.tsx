"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStats, getRecentActivity } from "@/lib/api/dashboard";
import { QUERY_KEYS } from "@/lib/utils/constants";
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor your Microsoft 365 migration operations at a glance.
        </p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <StatsCards stats={stats} />
      ) : null}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          {statsLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : stats ? (
            <ActiveMigrations jobs={stats.recentJobs} />
          ) : null}
        </div>

        <div className="lg:col-span-3">
          {activityLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <RecentActivity activities={activities ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
