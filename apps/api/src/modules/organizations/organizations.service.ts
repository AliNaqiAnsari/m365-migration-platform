import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@m365-migration/database';
import { PLAN_LIMITS, type PlanTier } from '@m365-migration/types';

@Injectable()
export class OrganizationsService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  async getCurrent(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { users: true, tenants: true, migrationJobs: true },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
            workloadAddons: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const plan = org.plan as PlanTier;
    const limits = PLAN_LIMITS[plan];

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      billingEmail: org.billingEmail,
      plan: org.plan,
      limits,
      subscription: org.subscription,
      counts: org._count,
      createdAt: org.createdAt.toISOString(),
    };
  }

  async update(organizationId: string, data: { name?: string; billingEmail?: string }) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name ?? org.name,
        billingEmail: data.billingEmail ?? org.billingEmail,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        billingEmail: true,
        plan: true,
      },
    });
  }
}
