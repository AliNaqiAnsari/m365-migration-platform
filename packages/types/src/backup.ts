// ============================================================================
// Backup & Archive Types
// ============================================================================

import type { UUID, Timestamps, Workload } from './common';

export type BackupType = 'full' | 'incremental' | 'differential' | 'continuous';
export type BackupStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
export type SnapshotStatus = 'creating' | 'completed' | 'failed' | 'expired' | 'deleted';
export type StorageTier = 'hot' | 'cool' | 'cold' | 'archive';

export interface BackupJob extends Timestamps {
  id: UUID;
  organizationId: UUID;
  tenantId: UUID;

  name: string;
  description?: string;
  backupType: BackupType;
  workloads: Workload[];
  scope: BackupScope;

  // Schedule (null for one-time)
  scheduleCron?: string;
  nextRunAt?: Date;

  // Retention
  retentionDays: number;
  storageTier: StorageTier;

  // Status
  status: BackupStatus;
  lastRunAt?: Date;
  lastRunStatus?: BackupStatus;

  // Stats
  totalSnapshots: number;
  totalStorageUsed: number; // bytes

  createdById: UUID;
}

export interface BackupScope {
  users?: string[];
  groups?: string[];
  sites?: string[];
  teams?: string[];
  allUsers?: boolean;
  allSites?: boolean;
  allTeams?: boolean;
}

export interface BackupSnapshot extends Timestamps {
  id: UUID;
  organizationId: UUID;
  backupJobId: UUID;

  snapshotType: BackupType;
  status: SnapshotStatus;

  // Storage
  storagePath: string;
  storageTier: StorageTier;
  sizeBytes: number;

  // Counts
  totalItems: number;
  backedUpItems: number;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  expiresAt: Date;

  // Delta info
  parentSnapshotId?: UUID;
  deltaToken?: string;

  metadata?: Record<string, unknown>;
}

export interface BackupItem {
  id: UUID;
  snapshotId: UUID;
  itemType: string; // 'email', 'file', 'calendar', etc.
  itemId: string;
  itemName: string;
  itemPath: string;
  sizeBytes: number;
  storagePath: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RestoreJob extends Timestamps {
  id: UUID;
  organizationId: UUID;
  snapshotId: UUID;
  targetTenantId: UUID;

  restoreType: 'full' | 'selective' | 'granular';
  status: 'pending' | 'running' | 'completed' | 'failed';

  // Selection
  selectedItems?: string[]; // Item IDs for selective restore
  restoreDestination: 'original' | 'alternate';
  alternatePath?: string;

  // Progress
  totalItems: number;
  restoredItems: number;
  failedItems: number;

  startedAt?: Date;
  completedAt?: Date;

  createdById: UUID;
}

// Archive Types
export type ArchiveStatus = 'active' | 'on_hold' | 'expired' | 'deleted';

export interface Archive extends Timestamps {
  id: UUID;
  organizationId: UUID;
  tenantId: UUID;

  name: string;
  description?: string;

  // Archive policy
  policyId?: UUID;
  status: ArchiveStatus;
  storageTier: StorageTier;

  // Storage
  storagePath: string;
  sizeBytes: number;
  itemCount: number;

  // Retention
  retentionEndDate?: Date;
  legalHold: boolean;
  legalHoldReason?: string;

  // Compliance
  immutable: boolean;
  chainOfCustody: ArchiveAuditEntry[];

  metadata?: Record<string, unknown>;
}

export interface ArchivePolicy extends Timestamps {
  id: UUID;
  organizationId: UUID;

  name: string;
  description?: string;

  // Triggers
  archiveAfterDays: number;
  archiveBySize?: number; // Archive items larger than X bytes
  archiveByType?: string[]; // Archive specific content types

  // Actions
  storageTier: StorageTier;
  retentionDays: number;
  deleteAfterRetention: boolean;

  // Scope
  applyToWorkloads: Workload[];
  applyToUsers?: string[];
  applyToSites?: string[];

  isActive: boolean;
}

export interface ArchiveAuditEntry {
  timestamp: Date;
  action: 'created' | 'accessed' | 'restored' | 'deleted' | 'hold_applied' | 'hold_removed';
  userId: UUID;
  details?: string;
}

export interface ArchiveSearchQuery {
  query: string;
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    itemTypes?: string[];
    users?: string[];
    sizeMin?: number;
    sizeMax?: number;
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface ArchiveSearchResult {
  items: ArchiveSearchItem[];
  total: number;
  facets?: {
    itemTypes: { type: string; count: number }[];
    users: { userId: string; name: string; count: number }[];
    dateRanges: { range: string; count: number }[];
  };
}

export interface ArchiveSearchItem {
  id: UUID;
  archiveId: UUID;
  itemType: string;
  itemName: string;
  itemPath: string;
  sizeBytes: number;
  createdAt: Date;
  modifiedAt: Date;
  owner?: string;
  highlights?: string[];
}

export interface CreateBackupJobRequest {
  name: string;
  description?: string;
  tenantId: UUID;
  backupType: BackupType;
  workloads: Workload[];
  scope: BackupScope;
  scheduleCron?: string;
  retentionDays?: number;
  storageTier?: StorageTier;
}

export interface CreateRestoreJobRequest {
  snapshotId: UUID;
  targetTenantId: UUID;
  restoreType: 'full' | 'selective' | 'granular';
  selectedItems?: string[];
  restoreDestination: 'original' | 'alternate';
  alternatePath?: string;
}
