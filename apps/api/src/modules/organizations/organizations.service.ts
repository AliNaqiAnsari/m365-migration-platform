import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async update(id: string, data: { name?: string; billingEmail?: string; settings?: Record<string, unknown> }) {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async getStats(id: string) {
    const [userCount, tenantCount, migrationStats] = await Promise.all([
      this.prisma.user.count({ where: { organizationId: id } }),
      this.prisma.tenant.count({ where: { organizationId: id } }),
      this.prisma.migrationJob.groupBy({
        by: ['status'],
        where: { organizationId: id },
        _count: { id: true },
      }),
    ]);

    const activeMigrations = migrationStats
      .filter((s) => ['RUNNING', 'PAUSED'].includes(s.status))
      .reduce((acc, s) => acc + s._count.id, 0);

    const completedMigrations = migrationStats
      .filter((s) => s.status === 'COMPLETED')
      .reduce((acc, s) => acc + s._count.id, 0);

    return {
      userCount,
      tenantCount,
      activeMigrations,
      completedMigrations,
    };
  }
}
