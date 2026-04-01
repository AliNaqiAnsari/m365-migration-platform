import { Worker, Job, Queue } from 'bullmq';
import type Redis from 'ioredis';
import type { PrismaClient } from '@m365-migration/database';
import type { Logger } from 'pino';
import { GraphClient } from '@m365-migration/graph-client';

export interface ProcessorDeps {
  redis: Redis;
  prisma: PrismaClient;
  logger: Logger;
}

export abstract class BaseProcessor<T = unknown> {
  protected redis: Redis;
  protected prisma: PrismaClient;
  protected logger: Logger;
  private worker: Worker | null = null;

  abstract readonly queueName: string;
  abstract readonly concurrency: number;

  constructor(deps: ProcessorDeps) {
    this.redis = deps.redis;
    this.prisma = deps.prisma;
    this.logger = deps.logger.child({ processor: this.constructor.name });
  }

  abstract process(job: Job<T>): Promise<void>;

  start(): void {
    this.worker = new Worker(
      this.queueName,
      async (job) => {
        this.logger.info({ jobId: job.id, name: job.name, data: job.data }, 'Processing job');
        try {
          await this.process(job);
          this.logger.info({ jobId: job.id }, 'Job completed');
        } catch (error) {
          this.logger.error({ jobId: job.id, error }, 'Job failed');
          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: this.concurrency,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    this.worker.on('error', (error) => {
      this.logger.error({ error }, 'Worker error');
    });
  }

  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  // Helper: Create a GraphClient for a tenant
  protected async createGraphClient(tenantDbId: string): Promise<GraphClient> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantDbId } });
    if (!tenant || !tenant.clientId || !tenant.clientSecret) {
      throw new Error(`Tenant ${tenantDbId} not found or missing credentials`);
    }

    const decryptedSecret = this.decryptSecret(tenant.clientSecret);

    return new GraphClient({
      config: {
        tenantId: tenant.tenantId,
        clientId: tenant.clientId,
        clientSecret: decryptedSecret,
      },
      redis: this.redis,
    });
  }

  // Helper: Update task progress
  protected async updateTaskProgress(
    taskId: string,
    update: {
      totalItems?: number;
      processedItems?: number;
      failedItems?: number;
      totalBytes?: bigint;
      processedBytes?: bigint;
      progressPercent?: number;
      status?: string;
      checkpointData?: unknown;
    },
  ): Promise<void> {
    const data: any = { updatedAt: new Date() };
    if (update.totalItems !== undefined) data.totalItems = update.totalItems;
    if (update.processedItems !== undefined) data.processedItems = update.processedItems;
    if (update.failedItems !== undefined) data.failedItems = update.failedItems;
    if (update.totalBytes !== undefined) data.totalBytes = update.totalBytes;
    if (update.processedBytes !== undefined) data.processedBytes = update.processedBytes;
    if (update.progressPercent !== undefined) data.progressPercent = update.progressPercent;
    if (update.status !== undefined) data.status = update.status;
    if (update.checkpointData !== undefined) {
      data.checkpointData = update.checkpointData;
      data.lastCheckpointAt = new Date();
    }

    await this.prisma.migrationTask.update({ where: { id: taskId }, data });

    // Publish progress event for SSE
    const task = await this.prisma.migrationTask.findUnique({
      where: { id: taskId },
      select: { jobId: true, workload: true, taskType: true },
    });
    if (task) {
      await this.publishProgress(task.jobId, 'task.progress', {
        taskId,
        workload: task.workload,
        taskType: task.taskType,
        ...update,
        totalBytes: update.totalBytes?.toString(),
        processedBytes: update.processedBytes?.toString(),
      }).catch(() => {}); // Non-critical, don't fail the task
    }
  }

  // Helper: Log a migration error
  protected async logError(
    taskId: string,
    error: {
      itemId?: string;
      itemName?: string;
      itemType?: string;
      errorCode: string;
      errorMessage: string;
      errorCategory?: string;
      httpStatus?: number;
      retryable?: boolean;
      stackTrace?: string;
    },
  ): Promise<void> {
    await this.prisma.migrationItemError.create({
      data: {
        taskId,
        itemId: error.itemId,
        itemName: error.itemName,
        itemType: error.itemType,
        errorCode: error.errorCode,
        errorMessage: error.errorMessage,
        errorCategory: (error.errorCategory as any) ?? 'PERMANENT',
        httpStatus: error.httpStatus,
        retryable: error.retryable ?? false,
        stackTrace: error.stackTrace,
      },
    });
  }

  // Helper: Add to dead letter
  protected async addToDeadLetter(
    jobId: string,
    taskId: string,
    item: {
      workload: string;
      itemId: string;
      itemType: string;
      itemName?: string;
      errorCode: string;
      errorMessage: string;
      originalPayload: unknown;
    },
  ): Promise<void> {
    await this.prisma.deadLetterItem.create({
      data: {
        jobId,
        taskId,
        workload: item.workload as any,
        itemId: item.itemId,
        itemType: item.itemType,
        itemName: item.itemName,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
        originalPayload: item.originalPayload as any,
      },
    });
  }

  // Helper: Resolve identity mapping (source ID → dest ID)
  protected async resolveMapping(jobId: string, objectType: string, sourceId: string): Promise<string | null> {
    const mapping = await this.prisma.identityMapping.findUnique({
      where: {
        jobId_objectType_sourceId: { jobId, objectType: objectType as any, sourceId },
      },
    });
    return mapping?.destinationId ?? null;
  }

  // Helper: Update job-level progress (aggregate from all tasks)
  protected async updateJobProgress(jobId: string): Promise<void> {
    const aggregation = await this.prisma.migrationTask.aggregate({
      where: { jobId },
      _sum: {
        processedItems: true,
        failedItems: true,
        totalItems: true,
        processedBytes: true,
        totalBytes: true,
      },
    });

    const jobData = {
      processedItems: aggregation._sum.processedItems ?? 0,
      failedItems: aggregation._sum.failedItems ?? 0,
      totalItems: aggregation._sum.totalItems ?? 0,
      processedBytes: aggregation._sum.processedBytes ?? BigInt(0),
      totalBytes: aggregation._sum.totalBytes ?? BigInt(0),
    };

    await this.prisma.migrationJob.update({ where: { id: jobId }, data: jobData });

    // Publish job-level progress for SSE
    await this.publishProgress(jobId, 'job.progress', {
      processedItems: jobData.processedItems,
      failedItems: jobData.failedItems,
      totalItems: jobData.totalItems,
      processedBytes: jobData.processedBytes.toString(),
      totalBytes: jobData.totalBytes.toString(),
    }).catch(() => {});
  }

  // Helper: Dispatch webhook events to all active endpoints for an org
  protected async dispatchWebhookEvent(
    organizationId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { organizationId, isActive: true, events: { has: event } },
    });

    if (endpoints.length === 0) return;

    const webhookQueue = new Queue('webhooks', { connection: this.redis });
    try {
      for (const endpoint of endpoints) {
        await webhookQueue.add(
          `deliver-${event}`,
          {
            endpointId: endpoint.id,
            url: endpoint.url,
            secret: endpoint.secret,
            event,
            payload,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        );
      }
    } finally {
      await webhookQueue.close();
    }
  }

  // Helper: Publish progress event via Redis pub/sub for SSE streaming
  protected async publishProgress(
    jobId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const channel = `migration:progress:${jobId}`;
    const message = JSON.stringify({ event, jobId, timestamp: new Date().toISOString(), ...data });
    await this.redis.publish(channel, message);
  }

  private decryptSecret(encrypted: string): string {
    const crypto = require('crypto');
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required but not set');
    }
    const [ivHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
