// Queue job payloads

export interface BaseJobPayload {
  jobId: string;
  organizationId: string;
  sourceTenantId: string;
  destTenantId: string;
}

export interface DiscoveryJobPayload extends BaseJobPayload {
  workloads: string[];
}

export interface MigrationTaskPayload extends BaseJobPayload {
  taskId: string;
  workload: string;
  taskType: string;
  sourceObjectId: string;
  destObjectId?: string;
  options: {
    batchSize: number;
    skipExisting: boolean;
    includePermissions: boolean;
    includeVersionHistory: boolean;
    deltaSync: boolean;
  };
}

export interface OrchestratorJobPayload extends BaseJobPayload {
  phase: string;
  workloads: string[];
}

export const QUEUE_NAMES = {
  ORCHESTRATOR: 'orchestrator',
  DISCOVERY: 'discovery',
  ENTRA_ID: 'entra-id',
  EXCHANGE: 'exchange',
  ONEDRIVE: 'onedrive',
  SHAREPOINT: 'sharepoint',
  TEAMS: 'teams',
  GROUPS: 'groups',
  PLANNER: 'planner',
  VALIDATION: 'validation',
  WEBHOOKS: 'webhooks',
  DEAD_LETTER: 'dead-letter',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
