import apiClient from "@/lib/api-client";
import type { LoginRequest, RegisterRequest, AuthTokens, AuthUser } from "@m365-migration/types";

export async function login(data: LoginRequest): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const res = await apiClient.post("/auth/login", data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const res = await apiClient.post("/auth/register", data);
  return res.data;
}

export async function refreshToken(refreshToken: string): Promise<AuthTokens> {
  const res = await apiClient.post("/auth/refresh", { refreshToken });
  return res.data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.post("/auth/reset-password", { token, password });
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiClient.get("/auth/me");
  return res.data;
}

export async function createApiKey(name: string): Promise<{ key: string; id: string }> {
  const res = await apiClient.post("/auth/api-keys", { name });
  return res.data;
}
