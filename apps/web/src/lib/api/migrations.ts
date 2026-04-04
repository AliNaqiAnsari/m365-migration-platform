import apiClient from "@/lib/api-client";
import type {
  CreateMigrationRequest,
  MigrationJobResponse,
  PaginationQuery,
  MigrationReport,
} from "@m365-migration/types";

export async function listMigrations(params?: PaginationQuery): Promise<MigrationJobResponse[]> {
  const res = await apiClient.get("/migrations", { params });
  return res.data;
}

export async function getMigration(id: string): Promise<MigrationJobResponse> {
  const res = await apiClient.get(`/migrations/${id}`);
  return res.data;
}

export async function createMigration(data: CreateMigrationRequest): Promise<MigrationJobResponse> {
  const res = await apiClient.post("/migrations", data);
  return res.data;
}

export async function startMigration(id: string): Promise<void> {
  await apiClient.post(`/migrations/${id}/start`);
}

export async function pauseMigration(id: string): Promise<void> {
  await apiClient.post(`/migrations/${id}/pause`);
}

export async function resumeMigration(id: string): Promise<void> {
  await apiClient.post(`/migrations/${id}/resume`);
}

export async function cancelMigration(id: string): Promise<void> {
  await apiClient.post(`/migrations/${id}/cancel`);
}

export async function getMigrationTasks(id: string, params?: PaginationQuery) {
  const res = await apiClient.get(`/migrations/${id}/tasks`, { params });
  return res.data;
}

export async function getMigrationErrors(id: string, params?: PaginationQuery & { category?: string }) {
  const res = await apiClient.get(`/migrations/${id}/errors`, { params });
  return res.data;
}

export async function getMigrationReport(id: string): Promise<MigrationReport> {
  const res = await apiClient.get(`/migrations/${id}/report`);
  return res.data;
}

export async function getDeadLetterItems(id: string, params?: PaginationQuery) {
  const res = await apiClient.get(`/migrations/${id}/dead-letter`, { params });
  return res.data;
}
