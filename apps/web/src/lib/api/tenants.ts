import apiClient from "@/lib/api-client";
import type { ConnectTenantRequest, TenantResponse, PaginationQuery } from "@m365-migration/types";

export async function listTenants(params?: PaginationQuery): Promise<TenantResponse[]> {
  const res = await apiClient.get("/tenants", { params });
  return res.data;
}

export async function getTenant(id: string): Promise<TenantResponse> {
  const res = await apiClient.get(`/tenants/${id}`);
  return res.data;
}

export async function connectTenant(data: ConnectTenantRequest): Promise<TenantResponse> {
  const res = await apiClient.post("/tenants/connect", data);
  return res.data;
}

export async function disconnectTenant(id: string): Promise<void> {
  await apiClient.post(`/tenants/${id}/disconnect`);
}

export async function deleteTenant(id: string): Promise<void> {
  await apiClient.delete(`/tenants/${id}`);
}
