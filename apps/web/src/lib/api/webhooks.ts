import apiClient from "@/lib/api-client";

export interface WebhookResponse {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  createdAt: string;
}

export async function listWebhooks(): Promise<WebhookResponse[]> {
  const res = await apiClient.get("/webhooks");
  return res.data;
}

export async function createWebhook(data: { url: string; events: string[] }): Promise<WebhookResponse> {
  const res = await apiClient.post("/webhooks", data);
  return res.data;
}

export async function updateWebhook(id: string, data: { url?: string; events?: string[]; active?: boolean }): Promise<WebhookResponse> {
  const res = await apiClient.patch(`/webhooks/${id}`, data);
  return res.data;
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`/webhooks/${id}`);
}
