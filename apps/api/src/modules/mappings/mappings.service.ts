import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@m365-migration/database';

@Injectable()
export class MappingsService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  async listMappings(jobId: string, organizationId: string, filters?: { objectType?: string; status?: string }) {
    await this.validateJobAccess(jobId, organizationId);

    const where: any = { jobId };
    if (filters?.objectType) where.objectType = filters.objectType;
    if (filters?.status) where.status = filters.status;

    return this.prisma.identityMapping.findMany({
      where,
      orderBy: [{ objectType: 'asc' }, { sourceIdentifier: 'asc' }],
    });
  }

  async updateMapping(jobId: string, mappingId: string, organizationId: string, data: {
    destinationId: string;
    destIdentifier?: string;
  }) {
    await this.validateJobAccess(jobId, organizationId);

    const mapping = await this.prisma.identityMapping.findFirst({
      where: { id: mappingId, jobId },
    });
    if (!mapping) throw new NotFoundException('Mapping not found');

    return this.prisma.identityMapping.update({
      where: { id: mappingId },
      data: {
        destinationId: data.destinationId,
        destIdentifier: data.destIdentifier,
        status: 'MANUALLY_MATCHED',
        matchStrategy: 'MANUAL',
      },
    });
  }

  async getMappingSummary(jobId: string, organizationId: string) {
    await this.validateJobAccess(jobId, organizationId);

    const mappings = await this.prisma.identityMapping.groupBy({
      by: ['objectType', 'status'],
      where: { jobId },
      _count: true,
    });

    return mappings.map((m) => ({
      objectType: m.objectType,
      status: m.status,
      count: m._count,
    }));
  }

  async validateMappings(jobId: string, organizationId: string) {
    await this.validateJobAccess(jobId, organizationId);

    const unmapped = await this.prisma.identityMapping.count({
      where: { jobId, status: 'PENDING' },
    });

    const total = await this.prisma.identityMapping.count({
      where: { jobId },
    });

    const mapped = total - unmapped;

    return {
      total,
      mapped,
      unmapped,
      isValid: unmapped === 0,
      message: unmapped > 0
        ? `${unmapped} objects are not yet mapped. Map them manually or run auto-mapping.`
        : 'All objects are mapped. Ready to proceed.',
    };
  }

  private async validateJobAccess(jobId: string, organizationId: string) {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw new NotFoundException('Migration job not found');
    return job;
  }
}
