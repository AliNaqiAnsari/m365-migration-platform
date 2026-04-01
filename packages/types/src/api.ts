// Standard API response envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Auth
export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

// Tenant connection
export interface ConnectTenantRequest {
  name: string;
  connectionType: 'SOURCE' | 'DESTINATION';
  provider: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE';
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  domain: string;
  provider: string;
  connectionType: string;
  status: string;
  userCount?: number;
  storageUsedBytes?: string;
  lastSyncAt?: string;
  createdAt: string;
}

// Migration job
export interface CreateMigrationRequest {
  name: string;
  description?: string;
  sourceTenantId: string;
  destTenantId: string;
  jobType?: string;
  workloads: string[];
  options?: MigrationOptions;
}

export interface MigrationOptions {
  concurrentTasks?: number;
  batchSize?: number;
  skipExisting?: boolean;
  includePermissions?: boolean;
  includeVersionHistory?: boolean;
  deltaSync?: boolean;
}

export interface MigrationJobResponse {
  id: string;
  name: string;
  status: string;
  currentPhase: string;
  workloads: string[];
  totalItems: number;
  processedItems: number;
  failedItems: number;
  skippedItems: number;
  totalBytes: string;
  processedBytes: string;
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  estimatedEndAt?: string;
  createdAt: string;
}

export interface MigrationProgressEvent {
  jobId: string;
  status: string;
  phase: string;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  progressPercent: number;
  currentWorkload?: string;
  message?: string;
  timestamp: string;
}

// Mapping
export interface IdentityMappingResponse {
  id: string;
  objectType: string;
  sourceId: string;
  sourceIdentifier?: string;
  destinationId?: string;
  destIdentifier?: string;
  status: string;
  matchStrategy?: string;
}

export interface UpdateMappingRequest {
  destinationId: string;
  destIdentifier?: string;
}
