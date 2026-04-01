import { Injectable, Inject } from '@nestjs/common';
import type { PrismaClient } from '@m365-migration/database';

@Injectable()
export class DashboardService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  async getStats(organizationId: string) {
    const [
      totalMigrations,
      activeMigrations,
      completedMigrations,
      failedMigrations,
      connectedTenants,
      jobAggregation,
    ] = await Promise.all([
      this.prisma.migrationJob.count({ where: { organizationId } }),
      this.prisma.migrationJob.count({
        where: { organizationId, status: { in: ['DISCOVERING', 'MAPPING', 'IN_PROGRESS'] } },
      }),
      this.prisma.migrationJob.count({
        where: { organizationId, status: { in: ['COMPLETED', 'COMPLETED_WITH_ERRORS'] } },
      }),
      this.prisma.migrationJob.count({
        where: { organizationId, status: 'FAILED' },
      }),
      this.prisma.tenant.count({ where: { organizationId, status: 'CONNECTED' } }),
      this.prisma.migrationJob.aggregate({
        where: { organizationId },
        _sum: { processedItems: true, processedBytes: true },
      }),
    ]);

    const successRate =
      totalMigrations > 0
        ? ((completedMigrations / (completedMigrations + failedMigrations)) * 100 || 0).toFixed(1)
        : '0';

    return {
      totalMigrations,
      activeMigrations,
      completedMigrations,
      failedMigrations,
      connectedTenants,
      successRate: parseFloat(successRate),
      totalItemsMigrated: jobAggregation._sum.processedItems ?? 0,
      totalDataMigrated: (jobAggregation._sum.processedBytes ?? BigInt(0)).toString(),
    };
  }

  async getRecentActivity(organizationId: string, limit = 20) {
    return this.prisma.activityLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
