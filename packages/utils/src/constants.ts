// ============================================================================
// Application Constants
// ============================================================================

// API Configuration
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Rate limits (per minute)
export const RATE_LIMITS = {
  default: 100,
  auth: 10,
  migration: 50,
  backup: 30,
  api: 1000,
} as const;

// Microsoft Graph API
export const GRAPH_API = {
  baseUrl: 'https://graph.microsoft.com/v1.0',
  betaUrl: 'https://graph.microsoft.com/beta',
  scopes: {
    default: 'https://graph.microsoft.com/.default',
    user: 'https://graph.microsoft.com/User.Read',
    mail: 'https://graph.microsoft.com/Mail.ReadWrite',
    calendar: 'https://graph.microsoft.com/Calendars.ReadWrite',
    files: 'https://graph.microsoft.com/Files.ReadWrite.All',
    sites: 'https://graph.microsoft.com/Sites.ReadWrite.All',
    teams: 'https://graph.microsoft.com/Team.ReadBasic.All',
  },
  rateLimits: {
    general: { requests: 10000, windowMs: 600000 }, // 10 min window
    outlook: { requests: 10000, windowMs: 600000 },
    sharepoint: { requests: 12000, windowMs: 600000 },
    teams: { requests: 30, windowMs: 1000 }, // Per second
    teamsMessages: { requests: 1, windowMs: 1000 }, // Per second
  },
} as const;

// Google Workspace API (Coming Soon)
export const GOOGLE_API = {
  baseUrl: 'https://www.googleapis.com',
  scopes: {
    gmail: 'https://www.googleapis.com/auth/gmail.readonly',
    drive: 'https://www.googleapis.com/auth/drive.readonly',
    calendar: 'https://www.googleapis.com/auth/calendar.readonly',
    admin: 'https://www.googleapis.com/auth/admin.directory.user.readonly',
  },
} as const;

// Job Queue Names
export const QUEUE_NAMES = {
  migration: 'migration-queue',
  exchange: 'exchange-migration',
  sharepoint: 'sharepoint-migration',
  onedrive: 'onedrive-migration',
  teams: 'teams-migration',
  backup: 'backup-queue',
  restore: 'restore-queue',
  notification: 'notification-queue',
  email: 'email-queue',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Server -> Client
  migrationProgress: 'migration:progress',
  migrationTaskUpdate: 'migration:task:update',
  migrationCompleted: 'migration:completed',
  migrationError: 'migration:error',
  backupProgress: 'backup:progress',
  backupCompleted: 'backup:completed',
  notification: 'notification',
  tenantStatus: 'tenant:status',

  // Client -> Server
  subscribeJob: 'subscribe:job',
  unsubscribeJob: 'unsubscribe:job',
  subscribeTenant: 'subscribe:tenant',
  unsubscribeTenant: 'unsubscribe:tenant',
} as const;

// File size limits
export const FILE_LIMITS = {
  maxUploadSize: 250 * 1024 * 1024 * 1024, // 250GB (OneDrive max)
  maxAttachmentSize: 150 * 1024 * 1024, // 150MB (Outlook max)
  chunkSize: 10 * 1024 * 1024, // 10MB chunks for large files
} as const;

// Session configuration
export const SESSION_CONFIG = {
  accessTokenExpiry: 15 * 60, // 15 minutes in seconds
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days in seconds
  mfaTempTokenExpiry: 5 * 60, // 5 minutes in seconds
} as const;

// Supported workloads by platform
export const PLATFORM_WORKLOADS = {
  microsoft365: ['exchange', 'sharepoint', 'onedrive', 'teams', 'planner', 'groups'] as const,
  google_workspace: ['gmail', 'drive', 'calendar', 'contacts', 'chat', 'meet'] as const,
} as const;

// Migration status flow
export const MIGRATION_STATUS_FLOW = [
  'draft',
  'pending',
  'validating',
  'ready',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
] as const;

// Backup retention presets
export const RETENTION_PRESETS = {
  '7days': 7,
  '30days': 30,
  '90days': 90,
  '1year': 365,
  '3years': 1095,
  '7years': 2555,
} as const;

// Storage tier costs (per GB per month, approximate)
export const STORAGE_COSTS = {
  hot: 0.023,
  cool: 0.0125,
  cold: 0.0036,
  archive: 0.00099,
} as const;

// Error codes
export const ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  INVALID_TOKEN: 'AUTH_003',
  MFA_REQUIRED: 'AUTH_004',
  INVALID_MFA_CODE: 'AUTH_005',
  ACCOUNT_LOCKED: 'AUTH_006',

  // Tenant errors
  TENANT_NOT_FOUND: 'TENANT_001',
  TENANT_CONNECTION_FAILED: 'TENANT_002',
  TENANT_TOKEN_EXPIRED: 'TENANT_003',
  TENANT_PERMISSION_DENIED: 'TENANT_004',

  // Migration errors
  MIGRATION_NOT_FOUND: 'MIG_001',
  MIGRATION_ALREADY_RUNNING: 'MIG_002',
  MIGRATION_CANNOT_START: 'MIG_003',
  MIGRATION_ITEM_FAILED: 'MIG_004',
  MIGRATION_RATE_LIMITED: 'MIG_005',

  // Backup errors
  BACKUP_NOT_FOUND: 'BACKUP_001',
  SNAPSHOT_NOT_FOUND: 'BACKUP_002',
  RESTORE_FAILED: 'BACKUP_003',

  // Billing errors
  PAYMENT_REQUIRED: 'BILLING_001',
  PAYMENT_FAILED: 'BILLING_002',
  SUBSCRIPTION_EXPIRED: 'BILLING_003',

  // General errors
  VALIDATION_ERROR: 'GENERAL_001',
  NOT_FOUND: 'GENERAL_002',
  FORBIDDEN: 'GENERAL_003',
  RATE_LIMITED: 'GENERAL_004',
  INTERNAL_ERROR: 'GENERAL_500',
} as const;
