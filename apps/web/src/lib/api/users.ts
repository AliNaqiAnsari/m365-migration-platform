import apiClient from "@/lib/api-client";

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export async function listUsers(): Promise<UserResponse[]> {
  const res = await apiClient.get("/users");
  return res.data;
}

export async function inviteUser(email: string, role: string): Promise<void> {
  await apiClient.post("/users/invite", { email, role });
}

export async function acceptInvite(token: string, data: { name: string; password: string }): Promise<void> {
  await apiClient.post(`/users/accept-invite/${token}`, data);
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  await apiClient.patch(`/users/${userId}/role`, { role });
}

export async function removeUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}

export async function getInvitations(): Promise<InvitationResponse[]> {
  const res = await apiClient.get("/users/invitations");
  return res.data;
}
