// Migration workload types and task definitions

export type WorkloadType =
  | 'EXCHANGE'
  | 'ONEDRIVE'
  | 'SHAREPOINT'
  | 'TEAMS'
  | 'GROUPS'
  | 'PLANNER'
  | 'ENTRA_ID';

export type MigrationPhaseType =
  | 'CREATED'
  | 'DISCOVERY'
  | 'MAPPING'
  | 'PRE_MIGRATION'
  | 'MIGRATION'
  | 'VALIDATION'
  | 'CUTOVER'
  | 'COMPLETED';

export type TaskType =
  // Exchange
  | 'mailbox'
  | 'calendar'
  | 'contacts'
  | 'mail_rules'
  | 'shared_mailbox'
  // OneDrive
  | 'user_drive'
  // SharePoint
  | 'site'
  | 'document_library'
  | 'list'
  | 'site_permissions'
  // Teams
  | 'team'
  | 'channel'
  | 'channel_messages'
  | 'channel_files'
  | 'team_settings'
  // Groups
  | 'group'
  | 'security_group'
  | 'distribution_list'
  // Planner
  | 'plan'
  | 'bucket'
  | 'planner_task'
  // Entra ID
  | 'user_sync'
  | 'license_mapping';

// Workload dependency order (what must complete before what starts)
export const WORKLOAD_DEPENDENCIES: Record<WorkloadType, WorkloadType[]> = {
  ENTRA_ID: [],
  GROUPS: ['ENTRA_ID'],
  EXCHANGE: ['ENTRA_ID'],
  ONEDRIVE: ['ENTRA_ID'],
  SHAREPOINT: ['GROUPS'],
  TEAMS: ['GROUPS'],
  PLANNER: ['GROUPS'],
};

// Checkpoint types for resume capability
export interface CheckpointData {
  type: 'delta_token' | 'page_cursor' | 'folder_position' | 'upload_session' | 'item_offset';
  key: string;
  value: string;
  itemsProcessed: number;
  bytesProcessed: number;
  updatedAt: string;
}

// Discovery result for a single object
export interface DiscoveredObject {
  objectType: string;
  objectId: string;
  displayName: string;
  identifier?: string;
  sizeBytes: number;
  itemCount: number;
  properties: Record<string, unknown>;
}

// Discovery summary
export interface DiscoverySummary {
  tenantId: string;
  tenantDomain: string;
  discoveredAt: string;
  totals: {
    users: number;
    groups: number;
    mailboxes: number;
    sites: number;
    teams: number;
    drives: number;
    plans: number;
    totalSizeBytes: number;
  };
  objects: DiscoveredObject[];
}

// Migration report
export interface MigrationReport {
  jobId: string;
  jobName: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: string;
  workloads: WorkloadReport[];
  errors: ErrorSummary;
  deadLetterCount: number;
}

export interface WorkloadReport {
  workload: WorkloadType;
  status: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  skippedItems: number;
  totalBytes: number;
  processedBytes: number;
  duration?: string;
}

export interface ErrorSummary {
  total: number;
  byCategory: Record<string, number>;
  byWorkload: Record<string, number>;
  topErrors: Array<{
    code: string;
    message: string;
    count: number;
  }>;
}
