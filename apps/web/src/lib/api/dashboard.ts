import apiClient from "@/lib/api-client";

export interface DashboardStats {
  totalMigrations: number;
  activeMigrations: number;
  completedMigrations: number;
  failedMigrations: number;
  totalTenants: number;
  totalDataMigrated: string;
  totalItemsMigrated: number;
  recentJobs: Array<{
    id: string;
    name: string;
    status: string;
    progressPercent: number;
    createdAt: string;
  }>;
}

export interface ActivityItem {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get("/dashboard/stats");
  return res.data;
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const res = await apiClient.get("/dashboard/recent-activity");
  return res.data;
}
