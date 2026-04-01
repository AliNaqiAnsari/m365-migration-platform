import { Injectable, Inject } from '@nestjs/common';
import type { PrismaClient, LogCategory } from '@m365-migration/database';

@Injectable()
export class ActivityLogsService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  async list(
    organizationId: string,
    filters?: {
      category?: string;
      jobId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;

    const where: any = { organizationId };
    if (filters?.category) where.category = filters.category;
    if (filters?.jobId) where.jobId = filters.jobId;
    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters?.from) where.createdAt.gte = new Date(filters.from);
      if (filters?.to) where.createdAt.lte = new Date(filters.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      items,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async log(params: {
    organizationId: string;
    userId?: string;
    jobId?: string;
    category: LogCategory;
    action: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        jobId: params.jobId,
        category: params.category,
        action: params.action,
        details: (params.details ?? {}) as any,
        ipAddress: params.ipAddress,
      },
    });
  }
}
