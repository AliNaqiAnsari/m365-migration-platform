import apiClient from "@/lib/api-client";
import type { DiscoverySummary } from "@m365-migration/types";

export async function triggerDiscovery(tenantId: string, workloads: string[]): Promise<void> {
  await apiClient.post("/discovery", { tenantId, workloads });
}

export async function getDiscoveryResults(tenantId: string): Promise<DiscoverySummary> {
  const res = await apiClient.get("/discovery", { params: { tenantId } });
  return res.data;
}
