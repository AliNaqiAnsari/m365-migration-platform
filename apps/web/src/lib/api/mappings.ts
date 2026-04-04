import apiClient from "@/lib/api-client";
import type { IdentityMappingResponse, UpdateMappingRequest, PaginationQuery } from "@m365-migration/types";

export async function listMappings(
  jobId: string,
  params?: PaginationQuery & { status?: string; objectType?: string }
): Promise<IdentityMappingResponse[]> {
  const res = await apiClient.get("/mappings", { params: { jobId, ...params } });
  return res.data;
}

export async function getMappingSummary(jobId: string) {
  const res = await apiClient.get("/mappings/summary", { params: { jobId } });
  return res.data;
}

export async function validateMappings(jobId: string) {
  const res = await apiClient.get("/mappings/validate", { params: { jobId } });
  return res.data;
}

export async function updateMapping(mappingId: string, data: UpdateMappingRequest): Promise<IdentityMappingResponse> {
  const res = await apiClient.put(`/mappings/${mappingId}`, data);
  return res.data;
}
