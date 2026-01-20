import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MigrationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('migration-queue') private migrationQueue: Queue,
  ) {}

  /**
   * List migration jobs for organization
   */
  async findAll(organizationId: string, options?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = options || {};
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(status && { status: status.toUpperCase() as any }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.migrationJob.findMany({
        where,
        include: {
          sourceTenant: { select: { id: true, tenantName: true, tenantDomain: true } },
          destinationTenant: { select: { id: true, tenantName: true, tenantDomain: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.migrationJob.count({ where }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get migration job by ID
   */
  async findById(id: string, organizationId: string) {
    const job = await this.prisma.migrationJob.findFirst({
      where: { id, organizationId },
      include: {
        sourceTenant: true,
        destinationTenant: true,
        createdBy: { select: { id: true, name: true, email: true } },
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Migration job not found');
    }

    return job;
  }

  /**
   * Create new migration job
   */
  async create(organizationId: string, userId: string, data: {
    name: string;
    description?: string;
    sourceTenantId: string;
    destinationTenantId: string;
    jobType: string;
    workloads: string[];
    scope: object;
    options?: object;
    scheduledAt?: Date;
  }) {
    // Validate tenants exist and belong to organization
    const [sourceTenant, destTenant] = await Promise.all([
      this.prisma.tenant.findFirst({
        where: { id: data.sourceTenantId, organizationId },
      }),
      this.prisma.tenant.findFirst({
        where: { id: data.destinationTenantId, organizationId },
      }),
    ]);

    if (!sourceTenant || !destTenant) {
      throw new BadRequestException('Invalid source or destination tenant');
    }

    if (sourceTenant.status !== 'CONNECTED' || destTenant.status !== 'CONNECTED') {
      throw new BadRequestException('Both tenants must be connected');
    }

    const job = await this.prisma.migrationJob.create({
      data: {
        organizationId,
        createdById: userId,
        sourceTenantId: data.sourceTenantId,
        destinationTenantId: data.destinationTenantId,
        name: data.name,
        description: data.description,
        jobType: data.jobType.toUpperCase() as any,
        workloads: data.workloads,
        scope: data.scope as any,
        options: (data.options || {}) as any,
        scheduledAt: data.scheduledAt,
        status: 'DRAFT',
      },
      include: {
        sourceTenant: { select: { tenantName: true } },
        destinationTenant: { select: { tenantName: true } },
      },
    });

    return job;
  }

  /**
   * Start migration job
   */
  async start(id: string, organizationId: string) {
    const job = await this.findById(id, organizationId);

    if (!['DRAFT', 'READY'].includes(job.status)) {
      throw new BadRequestException(`Cannot start job with status: ${job.status}`);
    }

    // Update status
    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'PENDING', startedAt: new Date() },
    });

    // Add to queue
    await this.migrationQueue.add('start-migration', {
      jobId: id,
      organizationId,
    });

    return { message: 'Migration started', jobId: id };
  }

  /**
   * Pause migration job
   */
  async pause(id: string, organizationId: string) {
    const job = await this.findById(id, organizationId);

    if (job.status !== 'RUNNING') {
      throw new BadRequestException('Can only pause running jobs');
    }

    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    return { message: 'Migration paused', jobId: id };
  }

  /**
   * Resume migration job
   */
  async resume(id: string, organizationId: string) {
    const job = await this.findById(id, organizationId);

    if (job.status !== 'PAUSED') {
      throw new BadRequestException('Can only resume paused jobs');
    }

    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'RUNNING' },
    });

    await this.migrationQueue.add('resume-migration', {
      jobId: id,
      organizationId,
    });

    return { message: 'Migration resumed', jobId: id };
  }

  /**
   * Cancel migration job
   */
  async cancel(id: string, organizationId: string) {
    const job = await this.findById(id, organizationId);

    if (!['RUNNING', 'PAUSED', 'PENDING'].includes(job.status)) {
      throw new BadRequestException('Cannot cancel this job');
    }

    await this.prisma.migrationJob.update({
      where: { id },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    return { message: 'Migration cancelled', jobId: id };
  }

  /**
   * Delete migration job
   */
  async delete(id: string, organizationId: string) {
    const job = await this.findById(id, organizationId);

    if (['RUNNING', 'PAUSED'].includes(job.status)) {
      throw new BadRequestException('Cannot delete active jobs');
    }

    await this.prisma.migrationJob.delete({ where: { id } });

    return { message: 'Migration deleted' };
  }

  /**
   * Get job tasks
   */
  async getTasks(id: string, organizationId: string) {
    await this.findById(id, organizationId); // Verify access

    return this.prisma.migrationTask.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get job errors
   */
  async getErrors(id: string, organizationId: string, options?: {
    page?: number;
    limit?: number;
  }) {
    await this.findById(id, organizationId); // Verify access

    const { page = 1, limit = 50 } = options || {};

    const [errors, total] = await Promise.all([
      this.prisma.migrationItemError.findMany({
        where: { jobId: id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.migrationItemError.count({ where: { jobId: id } }),
    ]);

    return { data: errors, meta: { total, page, limit } };
  }
}
