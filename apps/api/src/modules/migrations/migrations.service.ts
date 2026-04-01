import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { PrismaClient, Workload, MigrationJobStatus } from '@m365-migration/database';

@Injectable()
export class MigrationsService {
  constructor(
    @Inject('PRISMA') private prisma: PrismaClient,
    @InjectQueue('orchestrator') private orchestratorQueue: Queue,
  ) {}

  async list(organizationId: string, filters?: { status?: string; page?: number; pageSize?: number }) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;

    const where: any = { organizationId };
    if (filters?.status) {
      where.status = filters.status;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.migrationJob.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          currentPhase: true,
          jobType: true,
          workloads: true,
          totalItems: true,
          processedItems: true,
          failedItems: true,
          skippedItems: true,
          totalBytes: true,
          processedBytes: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.migrationJob.count({ where }),
    ]);

    return {
      items: jobs,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: string, organizationId: string) {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id, organizationId },
      include: {
        sourceTenant: { select: { id: true, name: true, domain: true } },
        destTenant: { select: { id: true, name: true, domain: true } },
        _count: { select: { tasks: true, deadLetterItems: true } },
      },
    });
    if (!job) throw new NotFoundException('Migration job not found');
    return job;
  }

  async create(organizationId: string, data: {
    name: string;
    description?: string;
    sourceTenantId: string;
    destTenantId: string;
    jobType?: string;
    workloads: string[];
    options?: Record<string, unknown>;
  }) {
    // Validate tenants belong to this org
    const [source, dest] = await Promise.all([
      this.prisma.tenant.findFirst({ where: { id: data.sourceTenantId, organizationId, connectionType: 'SOURCE' } }),
      this.prisma.tenant.findFirst({ where: { id: data.destTenantId, organizationId, connectionType: 'DESTINATION' } }),
    ]);
    if (!source) throw new BadRequestException('Source tenant not found or not connected as SOURCE');
    if (!dest) throw new BadRequestException('Destination tenant not found or not connected as DESTINATION');

    return this.prisma.migrationJob.create({
      data: {
        organizationId,
        sourceTenantId: data.sourceTenantId,
        destTenantId: data.destTenantId,
        name: data.name,
        description: data.description,
        jobType: (data.jobType as any) ?? 'FULL',
        workloads: data.workloads as Workload[],
        options: (data.options ?? {}) as any,
      },
    });
  }

  async start(id: string, organizationId: string) {
    const job = await this.getJob(id, organizationId);
    if (!['CREATED', 'READY'].includes(job.status)) {
      throw new BadRequestException(`Cannot start job in ${job.status} status`);
    }

    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'DISCOVERING', currentPhase: 'DISCOVERY', startedAt: new Date() },
    });

    await this.orchestratorQueue.add('start-migration', {
      jobId: id,
      organizationId,
      sourceTenantId: job.sourceTenantId,
      destTenantId: job.destTenantId,
      phase: 'DISCOVERY',
      workloads: job.workloads,
    });

    return { message: 'Migration started', jobId: id };
  }

  async pause(id: string, organizationId: string) {
    const job = await this.getJob(id, organizationId);
    if (job.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot pause job in ${job.status} status`);
    }

    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    return { message: 'Migration paused', jobId: id };
  }

  async resume(id: string, organizationId: string) {
    const job = await this.getJob(id, organizationId);
    if (job.status !== 'PAUSED') {
      throw new BadRequestException(`Cannot resume job in ${job.status} status`);
    }

    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await this.orchestratorQueue.add('resume-migration', {
      jobId: id,
      organizationId,
      sourceTenantId: job.sourceTenantId,
      destTenantId: job.destTenantId,
      phase: job.currentPhase,
      workloads: job.workloads,
    });

    return { message: 'Migration resumed', jobId: id };
  }

  async cancel(id: string, organizationId: string) {
    const job = await this.getJob(id, organizationId);
    if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(job.status)) {
      throw new BadRequestException(`Cannot cancel job in ${job.status} status`);
    }

    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    return { message: 'Migration cancelled', jobId: id };
  }

  async getTasks(id: string, organizationId: string) {
    await this.getJob(id, organizationId); // validate access
    return this.prisma.migrationTask.findMany({
      where: { jobId: id },
      orderBy: [{ workload: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getErrors(id: string, organizationId: string, page = 1, pageSize = 50) {
    await this.getJob(id, organizationId);
    const where = { task: { jobId: id } };
    const [errors, total] = await Promise.all([
      this.prisma.migrationItemError.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.migrationItemError.count({ where }),
    ]);
    return { items: errors, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getDeadLetterItems(id: string, organizationId: string) {
    await this.getJob(id, organizationId);
    return this.prisma.deadLetterItem.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReport(id: string, organizationId: string) {
    const job = await this.getJob(id, organizationId);

    // Get tasks grouped by workload
    const tasks = await this.prisma.migrationTask.findMany({
      where: { jobId: id },
      select: {
        workload: true,
        status: true,
        totalItems: true,
        processedItems: true,
        failedItems: true,
        totalBytes: true,
        processedBytes: true,
        startedAt: true,
        completedAt: true,
      },
    });

    const workloadMap = new Map<string, any>();
    for (const t of tasks) {
      const wl = t.workload;
      if (!workloadMap.has(wl)) {
        workloadMap.set(wl, {
          workload: wl,
          status: 'PENDING',
          totalItems: 0,
          processedItems: 0,
          failedItems: 0,

          totalBytes: BigInt(0),
          processedBytes: BigInt(0),
          taskCount: 0,
          completedTasks: 0,
          failedTasks: 0,
        });
      }
      const wlData = workloadMap.get(wl);
      wlData.totalItems += t.totalItems;
      wlData.processedItems += t.processedItems;
      wlData.failedItems += t.failedItems;

      wlData.totalBytes += t.totalBytes;
      wlData.processedBytes += t.processedBytes;
      wlData.taskCount++;
      if (t.status === 'COMPLETED' || t.status === 'COMPLETED_WITH_ERRORS') wlData.completedTasks++;
      if (t.status === 'FAILED') wlData.failedTasks++;
    }

    // Determine workload status
    for (const wlData of workloadMap.values()) {
      if (wlData.failedTasks > 0 && wlData.completedTasks > 0) wlData.status = 'COMPLETED_WITH_ERRORS';
      else if (wlData.failedTasks === wlData.taskCount) wlData.status = 'FAILED';
      else if (wlData.completedTasks === wlData.taskCount) wlData.status = 'COMPLETED';
      else wlData.status = 'IN_PROGRESS';
    }

    // Get errors summary
    const errors = await this.prisma.migrationItemError.findMany({
      where: { task: { jobId: id } },
      select: { errorCode: true, errorMessage: true, errorCategory: true, task: { select: { workload: true } } },
    });

    const byCategory: Record<string, number> = {};
    const byWorkload: Record<string, number> = {};
    const errorCounts = new Map<string, { code: string; message: string; count: number }>();

    for (const err of errors) {
      byCategory[err.errorCategory] = (byCategory[err.errorCategory] ?? 0) + 1;
      byWorkload[err.task.workload] = (byWorkload[err.task.workload] ?? 0) + 1;
      const key = err.errorCode;
      if (!errorCounts.has(key)) {
        errorCounts.set(key, { code: err.errorCode, message: err.errorMessage, count: 0 });
      }
      errorCounts.get(key)!.count++;
    }

    const topErrors = [...errorCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const deadLetterCount = await this.prisma.deadLetterItem.count({ where: { jobId: id } });

    // Compute duration
    let duration: string | undefined;
    if (job.startedAt) {
      const end = job.completedAt ?? new Date();
      const ms = end.getTime() - job.startedAt.getTime();
      const hours = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      duration = `${hours}h ${mins}m ${secs}s`;
    }

    return {
      jobId: job.id,
      jobName: job.name,
      status: job.status,
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      duration,
      workloads: [...workloadMap.values()].map((w) => ({
        workload: w.workload,
        status: w.status,
        totalItems: w.totalItems,
        processedItems: w.processedItems,
        failedItems: w.failedItems,

        totalBytes: w.totalBytes.toString(),
        processedBytes: w.processedBytes.toString(),
      })),
      errors: {
        total: errors.length,
        byCategory,
        byWorkload,
        topErrors,
      },
      deadLetterCount,
    };
  }

  private async getJob(id: string, organizationId: string) {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id, organizationId },
    });
    if (!job) throw new NotFoundException('Migration job not found');
    return job;
  }
}
