import apiClient from "@/lib/api-client";

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export async function getCurrentOrganization(): Promise<OrganizationResponse> {
  const res = await apiClient.get("/organizations/current");
  return res.data;
}

export async function updateOrganization(data: { name?: string }): Promise<OrganizationResponse> {
  const res = await apiClient.patch("/organizations/current", data);
  return res.data;
}
