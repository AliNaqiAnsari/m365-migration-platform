// ============================================================================
// Tenant (Connected Cloud Accounts) Types
// ============================================================================

import type { UUID, Timestamps, CloudPlatform } from './common';

export type TenantConnectionType = 'source' | 'destination';
export type TenantStatus = 'pending' | 'connected' | 'error' | 'disconnected';

export interface Tenant extends Timestamps {
  id: UUID;
  organizationId: UUID;
  platform: CloudPlatform;

  // Microsoft 365 specific
  tenantId?: string; // Azure AD tenant ID
  tenantName: string;
  tenantDomain: string;

  // Google Workspace specific (Coming Soon)
  googleCustomerId?: string;
  googleDomain?: string;

  connectionType: TenantConnectionType;
  status: TenantStatus;

  // Encrypted tokens (stored encrypted in DB)
  accessTokenEncrypted?: Buffer;
  refreshTokenEncrypted?: Buffer;
  tokenExpiresAt?: Date;

  // Inventory cache
  userCount: number;
  mailboxCount: number;
  siteCount: number;
  teamCount: number;
  driveStorageUsed: number; // in bytes

  lastSyncAt?: Date;
  lastError?: string;
  metadata?: Record<string, unknown>;
}

export interface TenantUser {
  id: string;
  displayName: string;
  email: string;
  userPrincipalName: string;
  department?: string;
  jobTitle?: string;
  officeLocation?: string;
  mailboxSize?: number;
  oneDriveSize?: number;
  licenseAssigned: boolean;
  createdDateTime: Date;
}

export interface TenantGroup {
  id: string;
  displayName: string;
  description?: string;
  groupType: 'security' | 'distribution' | 'microsoft365' | 'mailEnabled';
  memberCount: number;
  email?: string;
  createdDateTime: Date;
}

export interface TenantMailbox {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  mailboxType: 'user' | 'shared' | 'room' | 'equipment';
  totalItemCount: number;
  totalSize: number;
  archiveEnabled: boolean;
  archiveSize?: number;
}

export interface TenantSite {
  id: string;
  name: string;
  url: string;
  webUrl: string;
  siteType: 'teamSite' | 'communicationSite' | 'hubSite' | 'personal';
  storageUsed: number;
  storageAllocated: number;
  itemCount: number;
  lastModifiedDateTime: Date;
}

export interface TenantTeam {
  id: string;
  displayName: string;
  description?: string;
  visibility: 'public' | 'private';
  memberCount: number;
  channelCount: number;
  createdDateTime: Date;
  isArchived: boolean;
}

export interface ConnectTenantRequest {
  platform: CloudPlatform;
  connectionType: TenantConnectionType;
  // OAuth redirect will be handled separately
}

export interface TenantInventory {
  users: TenantUser[];
  groups: TenantGroup[];
  mailboxes: TenantMailbox[];
  sites: TenantSite[];
  teams: TenantTeam[];
  syncedAt: Date;
}

export interface TenantSyncProgress {
  tenantId: UUID;
  status: 'syncing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
