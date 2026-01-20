import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BackupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.backupJob.findMany({
      where: { organizationId },
      include: {
        tenant: { select: { tenantName: true, tenantDomain: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    const job = await this.prisma.backupJob.findFirst({
      where: { id, organizationId },
      include: {
        tenant: true,
        snapshots: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!job) {
      throw new NotFoundException('Backup job not found');
    }

    return job;
  }

  async create(organizationId: string, userId: string, data: {
    name: string;
    description?: string;
    tenantId: string;
    backupType: string;
    workloads: string[];
    scope: object;
    scheduleCron?: string;
    retentionDays?: number;
  }) {
    return this.prisma.backupJob.create({
      data: {
        organizationId,
        createdById: userId,
        tenantId: data.tenantId,
        name: data.name,
        description: data.description,
        backupType: data.backupType.toUpperCase() as any,
        workloads: data.workloads,
        scope: data.scope as any,
        scheduleCron: data.scheduleCron,
        retentionDays: data.retentionDays || 30,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findById(id, organizationId);
    await this.prisma.backupJob.delete({ where: { id } });
    return { message: 'Backup job deleted' };
  }
}
