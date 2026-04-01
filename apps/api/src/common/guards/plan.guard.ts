import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaClient, OrgPlan } from '@m365-migration/database';
import { PLAN_LIMITS, type PlanTier } from '@m365-migration/types';

export const PLAN_CHECK_KEY = 'plan_check';

export type PlanCheckType = 'tenant_limit' | 'concurrent_jobs' | 'workload_access';

export interface PlanCheckOptions {
  type: PlanCheckType;
  workload?: string;
}

export const PlanCheck = (options: PlanCheckOptions) =>
  SetMetadata(PLAN_CHECK_KEY, options);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('PRISMA') private prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<PlanCheckOptions>(PLAN_CHECK_KEY, context.getHandler());
    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.organizationId) return true;

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true },
    });

    const plan = (org?.plan ?? 'FREE') as PlanTier;
    const limits = PLAN_LIMITS[plan];

    switch (options.type) {
      case 'tenant_limit': {
        if (limits.maxTenants === -1) return true;
        const tenantCount = await this.prisma.tenant.count({
          where: { organizationId: user.organizationId, status: 'CONNECTED' },
        });
        if (tenantCount >= limits.maxTenants) {
          throw new ForbiddenException(
            `Plan ${plan} allows ${limits.maxTenants} tenants. Upgrade to connect more.`,
          );
        }
        return true;
      }

      case 'concurrent_jobs': {
        if (limits.maxConcurrentJobs === -1) return true;
        const activeJobs = await this.prisma.migrationJob.count({
          where: {
            organizationId: user.organizationId,
            status: { in: ['DISCOVERING', 'MAPPING', 'IN_PROGRESS'] },
          },
        });
        if (activeJobs >= limits.maxConcurrentJobs) {
          throw new ForbiddenException(
            `Plan ${plan} allows ${limits.maxConcurrentJobs} concurrent jobs. Upgrade for more.`,
          );
        }
        return true;
      }

      case 'workload_access': {
        const workload = options.workload ?? request.body?.workloads?.[0];
        if (!workload) return true;

        // Check subscription workload addons too
        const subscription = await this.prisma.subscription.findUnique({
          where: { organizationId: user.organizationId },
          select: { workloadAddons: true },
        });

        const allowedWorkloads = [
          ...limits.includedWorkloads,
          ...(subscription?.workloadAddons ?? []),
        ];

        const requestedWorkloads: string[] = request.body?.workloads ?? [workload];
        const blocked = requestedWorkloads.filter((w: string) => !allowedWorkloads.includes(w));

        if (blocked.length > 0) {
          throw new ForbiddenException(
            `Workloads [${blocked.join(', ')}] not included in your ${plan} plan. Upgrade or add them as add-ons.`,
          );
        }
        return true;
      }

      default:
        return true;
    }
  }
}
