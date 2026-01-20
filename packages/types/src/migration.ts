// ============================================================================
// Migration Types
// ============================================================================

import type { UUID, Timestamps, Workload } from './common';

export type MigrationJobType = 'full' | 'incremental' | 'selective' | 'cutover' | 'staged' | 'pilot';
export type MigrationStatus =
  | 'draft'
  | 'pending'
  | 'validating'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type MigrationTaskType =
  | 'user'
  | 'mailbox'
  | 'calendar'
  | 'contacts'
  | 'onedrive'
  | 'site'
  | 'team'
  | 'channel'
  | 'planner'
  | 'group';

export type MigrationTaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface MigrationJob extends Timestamps {
  id: UUID;
  organizationId: UUID;
  sourceTenantId: UUID;
  destinationTenantId: UUID;

  name: string;
  description?: string;
  jobType: MigrationJobType;
  workloads: Workload[];

  // Migration scope
  scope: MigrationScope;
  options: MigrationOptions;

  // Status tracking
  status: MigrationStatus;
  progress: number; // 0-100

  // Timing
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Statistics
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  totalBytes: number;
  transferredBytes: number;

  // Error tracking
  errorCount: number;
  lastError?: string;

  // Payment
  paymentStatus?: 'pending' | 'paid' | 'failed';
  stripePaymentId?: string;

  createdById: UUID;
}

export interface MigrationScope {
  // User selection
  users?: string[]; // User IDs
  groups?: string[]; // Group IDs
  allUsers?: boolean;

  // SharePoint selection
  sites?: string[]; // Site IDs
  allSites?: boolean;

  // Teams selection
  teams?: string[]; // Team IDs
  allTeams?: boolean;

  // Filters
  filters?: MigrationFilters;
}

export interface MigrationFilters {
  // Date range filter
  dateFrom?: Date;
  dateTo?: Date;

  // Size filter (in bytes)
  maxItemSize?: number;

  // Content type filters
  includeAttachments?: boolean;
  includeArchive?: boolean;
  includeSharedItems?: boolean;

  // Exclusions
  excludeFolders?: string[];
  excludeFileTypes?: string[];
}

export interface MigrationOptions {
  // General options
  preserveTimestamps: boolean;
  preservePermissions: boolean;
  preserveVersionHistory: boolean;
  skipExistingItems: boolean;

  // Conflict handling
  conflictResolution: 'skip' | 'overwrite' | 'rename' | 'keepBoth';

  // Performance
  batchSize: number;
  concurrentTasks: number;
  throttleRequests: boolean;

  // Notifications
  notifyOnComplete: boolean;
  notifyOnError: boolean;
  webhookUrl?: string;

  // Advanced
  dryRun: boolean;
  enableLogging: boolean;
  retryFailedItems: boolean;
  maxRetries: number;
}

export interface MigrationTask extends Timestamps {
  id: UUID;
  jobId: UUID;
  organizationId: UUID;

  taskType: MigrationTaskType;
  workload: Workload;

  // Source info
  sourceId: string;
  sourceName?: string;
  sourcePath?: string;

  // Destination info
  destinationId?: string;
  destinationPath?: string;

  // Status
  status: MigrationTaskStatus;
  progress: number;

  // Item counts
  totalItems: number;
  processedItems: number;
  failedItems: number;

  // Size tracking
  totalBytes: number;
  transferredBytes: number;

  // Timing
  startedAt?: Date;
  completedAt?: Date;

  // Delta tracking
  lastDeltaToken?: string;
  lastSyncAt?: Date;

  // Errors
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;

  metadata?: Record<string, unknown>;
}

export interface MigrationItemError {
  id: UUID;
  taskId: UUID;
  jobId: UUID;
  itemId: string;
  itemName?: string;
  itemType: string;
  errorCode: string;
  errorMessage: string;
  errorDetails?: Record<string, unknown>;
  retryCount: number;
  canRetry: boolean;
  timestamp: Date;
}

export interface CreateMigrationJobRequest {
  name: string;
  description?: string;
  sourceTenantId: UUID;
  destinationTenantId: UUID;
  jobType: MigrationJobType;
  workloads: Workload[];
  scope: MigrationScope;
  options?: Partial<MigrationOptions>;
  scheduledAt?: Date;
}

export interface MigrationProgress {
  jobId: UUID;
  status: MigrationStatus;
  progress: number;
  processedItems: number;
  totalItems: number;
  transferredBytes: number;
  totalBytes: number;
  currentTask?: string;
  estimatedTimeRemaining?: number; // in seconds
  speed?: number; // bytes per second
}

export interface MigrationReport {
  job: MigrationJob;
  tasks: MigrationTask[];
  errors: MigrationItemError[];
  summary: {
    totalUsers: number;
    migratedUsers: number;
    totalMailboxes: number;
    migratedMailboxes: number;
    totalSites: number;
    migratedSites: number;
    totalTeams: number;
    migratedTeams: number;
    totalDataMigrated: number;
    duration: number; // in seconds
    averageSpeed: number; // bytes per second
  };
  generatedAt: Date;
}
