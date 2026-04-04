import apiClient from "@/lib/api-client";
import type { CheckoutRequest, SubscriptionInfo, UsageInfo } from "@m365-migration/types";

export async function createCheckout(data: CheckoutRequest): Promise<{ url: string }> {
  const res = await apiClient.post("/billing/create-checkout", data);
  return res.data;
}

export async function createCustomerPortal(): Promise<{ url: string }> {
  const res = await apiClient.post("/billing/customer-portal");
  return res.data;
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  const res = await apiClient.get("/billing/subscription");
  return res.data;
}

export async function getUsage(): Promise<UsageInfo> {
  const res = await apiClient.get("/billing/usage");
  return res.data;
}

export async function getInvoices() {
  const res = await apiClient.get("/billing/invoices");
  return res.data;
}
