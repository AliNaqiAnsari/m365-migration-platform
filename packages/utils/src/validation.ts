// ============================================================================
// Validation Schemas (Zod)
// ============================================================================

import { z } from 'zod';

// Common validators
export const emailSchema = z.string().email('Invalid email address');
export const uuidSchema = z.string().uuid('Invalid UUID');
export const urlSchema = z.string().url('Invalid URL');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export const mfaVerifySchema = z.object({
  tempToken: z.string().min(1, 'Temp token is required'),
  code: z.string().length(6, 'MFA code must be 6 digits').regex(/^\d+$/, 'MFA code must be numeric'),
});

// Organization schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  plan: z.enum(['free', 'starter', 'business', 'enterprise']).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  billingEmail: emailSchema.optional(),
  settings: z
    .object({
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      notifications: z
        .object({
          emailOnJobComplete: z.boolean().optional(),
          emailOnJobFailed: z.boolean().optional(),
          emailOnBackupComplete: z.boolean().optional(),
          slackWebhookUrl: urlSchema.optional().nullable(),
          teamsWebhookUrl: urlSchema.optional().nullable(),
        })
        .optional(),
      security: z
        .object({
          requireMfa: z.boolean().optional(),
          sessionTimeoutMinutes: z.number().min(5).max(1440).optional(),
          ipWhitelist: z.array(z.string()).optional(),
          allowedDomains: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
});

// Tenant schemas
export const connectTenantSchema = z.object({
  platform: z.enum(['microsoft365', 'google_workspace']),
  connectionType: z.enum(['source', 'destination']),
});

// Migration schemas
export const workloadSchema = z.enum([
  'exchange',
  'sharepoint',
  'onedrive',
  'teams',
  'planner',
  'groups',
  'gmail',
  'drive',
  'calendar',
  'contacts',
  'chat',
  'meet',
]);

export const migrationScopeSchema = z.object({
  users: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  allUsers: z.boolean().optional(),
  sites: z.array(z.string()).optional(),
  allSites: z.boolean().optional(),
  teams: z.array(z.string()).optional(),
  allTeams: z.boolean().optional(),
  filters: z
    .object({
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      maxItemSize: z.number().positive().optional(),
      includeAttachments: z.boolean().optional(),
      includeArchive: z.boolean().optional(),
      includeSharedItems: z.boolean().optional(),
      excludeFolders: z.array(z.string()).optional(),
      excludeFileTypes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const migrationOptionsSchema = z.object({
  preserveTimestamps: z.boolean().default(true),
  preservePermissions: z.boolean().default(true),
  preserveVersionHistory: z.boolean().default(false),
  skipExistingItems: z.boolean().default(false),
  conflictResolution: z.enum(['skip', 'overwrite', 'rename', 'keepBoth']).default('skip'),
  batchSize: z.number().min(1).max(1000).default(100),
  concurrentTasks: z.number().min(1).max(20).default(5),
  throttleRequests: z.boolean().default(true),
  notifyOnComplete: z.boolean().default(true),
  notifyOnError: z.boolean().default(true),
  webhookUrl: urlSchema.optional(),
  dryRun: z.boolean().default(false),
  enableLogging: z.boolean().default(true),
  retryFailedItems: z.boolean().default(true),
  maxRetries: z.number().min(0).max(10).default(3),
});

export const createMigrationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  sourceTenantId: uuidSchema,
  destinationTenantId: uuidSchema,
  jobType: z.enum(['full', 'incremental', 'selective', 'cutover', 'staged', 'pilot']),
  workloads: z.array(workloadSchema).min(1, 'Select at least one workload'),
  scope: migrationScopeSchema,
  options: migrationOptionsSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
});

// Backup schemas
export const backupScopeSchema = z.object({
  users: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional(),
  sites: z.array(z.string()).optional(),
  teams: z.array(z.string()).optional(),
  allUsers: z.boolean().optional(),
  allSites: z.boolean().optional(),
  allTeams: z.boolean().optional(),
});

export const createBackupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  tenantId: uuidSchema,
  backupType: z.enum(['full', 'incremental', 'differential', 'continuous']),
  workloads: z.array(workloadSchema).min(1, 'Select at least one workload'),
  scope: backupScopeSchema,
  scheduleCron: z.string().optional(),
  retentionDays: z.number().min(1).max(3650).default(30),
  storageTier: z.enum(['hot', 'cool', 'cold', 'archive']).default('hot'),
});

export const createRestoreSchema = z.object({
  snapshotId: uuidSchema,
  targetTenantId: uuidSchema,
  restoreType: z.enum(['full', 'selective', 'granular']),
  selectedItems: z.array(z.string()).optional(),
  restoreDestination: z.enum(['original', 'alternate']),
  alternatePath: z.string().optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type inference helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateMigrationInput = z.infer<typeof createMigrationSchema>;
export type CreateBackupInput = z.infer<typeof createBackupSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
