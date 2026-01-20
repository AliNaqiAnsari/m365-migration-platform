// ============================================================================
// Organization Types
// ============================================================================

import type { UUID, Timestamps } from './common';

export type PlanType = 'free' | 'starter' | 'business' | 'enterprise';

export interface Organization extends Timestamps {
  id: UUID;
  name: string;
  slug: string;
  plan: PlanType;
  billingEmail?: string;
  stripeCustomerId?: string;
  settings: OrganizationSettings;
}

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

export interface NotificationSettings {
  emailOnJobComplete: boolean;
  emailOnJobFailed: boolean;
  emailOnBackupComplete: boolean;
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;
}

export interface SecuritySettings {
  requireMfa: boolean;
  sessionTimeoutMinutes: number;
  ipWhitelist?: string[];
  allowedDomains?: string[];
}

export interface CreateOrganizationRequest {
  name: string;
  plan?: PlanType;
}

export interface UpdateOrganizationRequest {
  name?: string;
  billingEmail?: string;
  settings?: Partial<OrganizationSettings>;
}

export interface OrganizationStats {
  userCount: number;
  tenantCount: number;
  activeMigrations: number;
  completedMigrations: number;
  totalDataMigrated: number; // in bytes
  activeBackupJobs: number;
}
