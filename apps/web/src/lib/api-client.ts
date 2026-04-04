import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Token getter — set by ClerkTokenProvider on the client side
let getClerkToken: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(getter: () => Promise<string | null>) {
  getClerkToken = getter;
}

// Request interceptor: attach Clerk auth token
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (getClerkToken) {
    try {
      const token = await getClerkToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Clerk not ready yet — proceed without token
    }
  }
  return config;
});

// Response interceptor: unwrap { success, data } envelope
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      const envelope = response.data as { success: boolean; data?: unknown; meta?: unknown };
      if (envelope.data !== undefined) {
        response.data = envelope.data;
      }
      if (envelope.meta) {
        (response as any).meta = envelope.meta;
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    // On 401, Clerk middleware will handle redirect to sign-in
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/sign-in";
      return Promise.reject(error);
    }

    // Extract error message from API envelope
    if (error.response?.data) {
      const envelope = error.response.data as { error?: { message?: string } };
      if (envelope.error?.message) {
        error.message = envelope.error.message;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
