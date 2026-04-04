import apiClient from "@/lib/api-client";
import type { PaginationQuery } from "@m365-migration/types";

export interface ActivityLogResponse {
  id: string;
  action: string;
  category: string;
  description: string;
  userId: string;
  userName: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export async function listActivityLogs(
  params?: PaginationQuery & { category?: string; startDate?: string; endDate?: string }
): Promise<ActivityLogResponse[]> {
  const res = await apiClient.get("/activity-logs", { params });
  return res.data;
}
