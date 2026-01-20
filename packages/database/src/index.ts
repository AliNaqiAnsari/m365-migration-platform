// ============================================================================
// M365 Migration Platform - Database Package
// ============================================================================

import { PrismaClient } from '@prisma/client';

// Export Prisma Client
export * from '@prisma/client';

// Create a singleton instance of PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export default client
export default prisma;

// Type helpers
export type {
  Organization,
  User,
  Session,
  Tenant,
  MigrationJob,
  MigrationTask,
  MigrationItemError,
  BackupJob,
  BackupSnapshot,
  BackupItem,
  RestoreJob,
  Archive,
  ArchivePolicy,
  PricingPlan,
  Subscription,
  UsageRecord,
  Invoice,
  ActivityLog,
  Webhook,
} from '@prisma/client';
