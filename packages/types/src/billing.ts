// Billing & plan configuration

export type PlanTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface PlanLimits {
  maxTenants: number;
  maxConcurrentJobs: number;
  maxDataPerMonthBytes: number;
  maxUsers: number;
  includedWorkloads: string[];
}

// -1 means unlimited
export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxTenants: 2,
    maxConcurrentJobs: 1,
    maxDataPerMonthBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    maxUsers: 2,
    includedWorkloads: ['EXCHANGE'],
  },
  STARTER: {
    maxTenants: 5,
    maxConcurrentJobs: 3,
    maxDataPerMonthBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    maxUsers: 5,
    includedWorkloads: ['EXCHANGE', 'ONEDRIVE'],
  },
  PROFESSIONAL: {
    maxTenants: 20,
    maxConcurrentJobs: 10,
    maxDataPerMonthBytes: 500 * 1024 * 1024 * 1024, // 500 GB
    maxUsers: 20,
    includedWorkloads: ['EXCHANGE', 'ONEDRIVE', 'SHAREPOINT', 'TEAMS'],
  },
  ENTERPRISE: {
    maxTenants: -1,
    maxConcurrentJobs: -1,
    maxDataPerMonthBytes: -1,
    maxUsers: -1,
    includedWorkloads: ['EXCHANGE', 'ONEDRIVE', 'SHAREPOINT', 'TEAMS', 'GROUPS', 'PLANNER', 'ENTRA_ID'],
  },
};

export interface CheckoutRequest {
  plan: PlanTier;
  workloadAddons?: string[];
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionInfo {
  plan: PlanTier;
  status: string;
  workloadAddons: string[];
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
}

export interface UsageInfo {
  periodStart: string;
  periodEnd: string;
  dataMigratedBytes: string;
  itemsMigrated: number;
  apiCalls: number;
  limits: PlanLimits;
}
