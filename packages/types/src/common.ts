// ============================================================================
// Common Types
// ============================================================================

export type UUID = string;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type LogLevel = 'debug' | 'info' | 'warning' | 'error';

export interface ActivityLog {
  id: UUID;
  organizationId: UUID;
  userId?: UUID;
  timestamp: Date;
  level: LogLevel;
  category: 'migration' | 'backup' | 'auth' | 'system' | 'billing';
  jobId?: UUID;
  taskId?: UUID;
  message: string;
  details?: Record<string, unknown>;
  sourceIp?: string;
  userAgent?: string;
}

// Supported cloud platforms
export type CloudPlatform = 'microsoft365' | 'google_workspace';

// Platform-specific workloads
export type M365Workload =
  | 'exchange'
  | 'sharepoint'
  | 'onedrive'
  | 'teams'
  | 'planner'
  | 'groups';

export type GoogleWorkspaceWorkload =
  | 'gmail'
  | 'drive'
  | 'calendar'
  | 'contacts'
  | 'chat'
  | 'meet';

export type Workload = M365Workload | GoogleWorkspaceWorkload;

// Feature flags for coming soon features
export interface FeatureFlags {
  googleWorkspaceMigration: boolean; // Coming Soon
  powerAutomateExport: boolean;
  powerAppsExport: boolean;
  advancedAnalytics: boolean;
}
