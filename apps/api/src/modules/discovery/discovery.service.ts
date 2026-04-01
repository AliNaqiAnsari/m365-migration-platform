import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { PrismaClient } from '@m365-migration/database';

@Injectable()
export class DiscoveryService {
  constructor(
    @Inject('PRISMA') private prisma: PrismaClient,
    @InjectQueue('discovery') private discoveryQueue: Queue,
  ) {}

  async triggerDiscovery(jobId: string, organizationId: string) {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException('Migration job not found');

    await this.discoveryQueue.add('discover-tenant', {
      jobId,
      organizationId,
      sourceTenantId: job.sourceTenantId,
      destTenantId: job.destTenantId,
      workloads: job.workloads,
    });

    return { message: 'Discovery started', jobId };
  }

  async getDiscoveryResults(jobId: string, organizationId: string) {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException('Migration job not found');

    const discoveries = await this.prisma.tenantDiscovery.findMany({
      where: { jobId },
      orderBy: [{ objectType: 'asc' }, { displayName: 'asc' }],
    });

    // Aggregate by type
    const summary: Record<string, { count: number; totalSizeBytes: bigint }> = {};
    for (const d of discoveries) {
      if (!summary[d.objectType]) {
        summary[d.objectType] = { count: 0, totalSizeBytes: BigInt(0) };
      }
      summary[d.objectType].count++;
      summary[d.objectType].totalSizeBytes += d.sizeBytes;
    }

    return {
      jobId,
      summary: Object.entries(summary).map(([type, data]) => ({
        objectType: type,
        count: data.count,
        totalSizeBytes: data.totalSizeBytes.toString(),
      })),
      items: discoveries.map((d) => ({
        ...d,
        sizeBytes: d.sizeBytes.toString(),
      })),
    };
  }
}
