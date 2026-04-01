import { Job, Queue } from 'bullmq';
import { BaseProcessor, type ProcessorDeps } from './base.processor';
import type { OrchestratorJobPayload } from '@m365-migration/types';
import { WORKLOAD_DEPENDENCIES } from '@m365-migration/types';

export class OrchestratorProcessor extends BaseProcessor<OrchestratorJobPayload> {
  readonly queueName = 'orchestrator';
  readonly concurrency = 5;

  private workloadQueues = new Map<string, Queue>();

  /** Sanitize a string for use in OData $filter expressions */
  private sanitizeODataValue(value: string): string {
    return value.replace(/[^a-zA-Z0-9._@\-]/g, '');
  }

  constructor(deps: ProcessorDeps) {
    super(deps);
    // Create queue references for each workload
    const queues = ['discovery', 'entra-id', 'exchange', 'onedrive', 'sharepoint', 'teams', 'groups', 'planner'];
    for (const name of queues) {
      this.workloadQueues.set(name, new Queue(name, { connection: this.redis }));
    }
  }

  async process(job: Job<OrchestratorJobPayload>): Promise<void> {
    const { jobId, phase, workloads } = job.data;

    switch (phase) {
      case 'DISCOVERY':
        await this.runDiscovery(job.data);
        break;
      case 'MAPPING':
        await this.runAutoMapping(job.data);
        break;
      case 'PRE_MIGRATION':
        await this.runPreMigration(job.data);
        break;
      case 'MIGRATION':
        await this.runMigration(job.data);
        break;
      case 'VALIDATION':
        await this.runValidation(job.data);
        break;
      default:
        this.logger.warn({ phase }, 'Unknown phase');
    }
  }

  private async runDiscovery(data: OrchestratorJobPayload): Promise<void> {
    const { jobId } = data;
    this.logger.info({ jobId }, 'Starting discovery phase');

    const discoveryQueue = this.workloadQueues.get('discovery')!;
    await discoveryQueue.add('discover-tenant', data);

    // The discovery processor will update the job when done and trigger the next phase
  }

  private async runAutoMapping(data: OrchestratorJobPayload): Promise<void> {
    const { jobId, sourceTenantId, destTenantId } = data;
    this.logger.info({ jobId }, 'Starting auto-mapping phase');

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: 'MAPPING', currentPhase: 'MAPPING' },
    });

    // Get all discovered objects from source
    const sourceObjects = await this.prisma.tenantDiscovery.findMany({
      where: { jobId },
    });

    // Get destination tenant for comparison
    const destClient = await this.createGraphClient(destTenantId);

    // Auto-match users by UPN local part
    for (const obj of sourceObjects) {
      if (obj.objectType === 'USER' && obj.identifier) {
        const localPart = this.sanitizeODataValue(obj.identifier.split('@')[0]);
        try {
          // Search for user in destination by local part
          const destUsers = await destClient.request<{ value: Array<{ id: string; userPrincipalName: string }> }>(
            `/users?$filter=startswith(userPrincipalName,'${localPart}')&$select=id,userPrincipalName&$top=1`,
          );

          if (destUsers.value.length > 0) {
            await this.prisma.identityMapping.upsert({
              where: {
                jobId_objectType_sourceId: { jobId, objectType: 'USER', sourceId: obj.objectId },
              },
              create: {
                jobId,
                objectType: 'USER',
                sourceId: obj.objectId,
                sourceIdentifier: obj.identifier,
                destinationId: destUsers.value[0].id,
                destIdentifier: destUsers.value[0].userPrincipalName,
                status: 'AUTO_MATCHED',
                matchStrategy: 'UPN_MATCH',
              },
              update: {
                destinationId: destUsers.value[0].id,
                destIdentifier: destUsers.value[0].userPrincipalName,
                status: 'AUTO_MATCHED',
                matchStrategy: 'UPN_MATCH',
              },
            });
          } else {
            await this.prisma.identityMapping.upsert({
              where: {
                jobId_objectType_sourceId: { jobId, objectType: 'USER', sourceId: obj.objectId },
              },
              create: {
                jobId,
                objectType: 'USER',
                sourceId: obj.objectId,
                sourceIdentifier: obj.identifier,
                status: 'PENDING',
              },
              update: {},
            });
          }
        } catch (error) {
          this.logger.warn({ sourceId: obj.objectId, error }, 'Failed to auto-match user');
        }
      }

      // Auto-match groups by display name
      if (['GROUP', 'SECURITY_GROUP', 'DISTRIBUTION_LIST'].includes(obj.objectType)) {
        try {
          const safeDisplayName = obj.displayName.replace(/'/g, "''").replace(/[\\]/g, '');
          const destGroups = await destClient.request<{ value: Array<{ id: string; displayName: string }> }>(
            `/groups?$filter=displayName eq '${safeDisplayName}'&$select=id,displayName&$top=1`,
          );

          const status = destGroups.value.length > 0 ? 'AUTO_MATCHED' : 'PENDING';
          await this.prisma.identityMapping.upsert({
            where: {
              jobId_objectType_sourceId: { jobId, objectType: obj.objectType as any, sourceId: obj.objectId },
            },
            create: {
              jobId,
              objectType: obj.objectType as any,
              sourceId: obj.objectId,
              sourceIdentifier: obj.displayName,
              destinationId: destGroups.value[0]?.id,
              destIdentifier: destGroups.value[0]?.displayName,
              status,
              matchStrategy: status === 'AUTO_MATCHED' ? 'DISPLAY_NAME_MATCH' : undefined,
            },
            update: destGroups.value.length > 0
              ? {
                  destinationId: destGroups.value[0].id,
                  destIdentifier: destGroups.value[0].displayName,
                  status: 'AUTO_MATCHED',
                  matchStrategy: 'DISPLAY_NAME_MATCH',
                }
              : {},
          });
        } catch (error) {
          this.logger.warn({ sourceId: obj.objectId, error }, 'Failed to auto-match group');
        }
      }
    }

    this.logger.info({ jobId }, 'Auto-mapping complete');

    // Check if all are mapped
    const unmapped = await this.prisma.identityMapping.count({
      where: { jobId, status: 'PENDING' },
    });

    if (unmapped > 0) {
      // Wait for manual mapping — set status to READY
      await this.prisma.migrationJob.update({
        where: { id: jobId },
        data: { status: 'READY' },
      });
      this.logger.info({ jobId, unmapped }, 'Waiting for manual mapping');
    } else {
      // All mapped — proceed to migration
      await this.advancePhase(data, 'MIGRATION');
    }
  }

  private async runPreMigration(data: OrchestratorJobPayload): Promise<void> {
    const { jobId } = data;
    this.logger.info({ jobId }, 'Starting pre-migration phase');
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { currentPhase: 'PRE_MIGRATION' },
    });

    // Pre-migration: create any objects in destination that don't exist yet
    // For now, this is a pass-through — objects are expected to exist
    await this.advancePhase(data, 'MIGRATION');
  }

  private async runMigration(data: OrchestratorJobPayload): Promise<void> {
    const { jobId, workloads } = data;
    await this.publishProgress(jobId, 'phase.changed', { phase: 'MIGRATION', workloads });

    // Dispatch webhook: migration.started
    this.dispatchWebhookEvent(data.organizationId, 'migration.started', {
      jobId,
      workloads,
      phase: 'MIGRATION',
    }).catch(() => {});

    this.logger.info({ jobId, workloads }, 'Starting migration phase');

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: 'IN_PROGRESS', currentPhase: 'MIGRATION' },
    });

    // Resolve workload execution order based on dependencies
    const orderedWorkloads = this.resolveWorkloadOrder(workloads as any[]);

    // For each workload, get all mapped objects and create tasks
    for (const workload of orderedWorkloads) {
      // Wait for dependencies to complete
      const deps = WORKLOAD_DEPENDENCIES[workload as keyof typeof WORKLOAD_DEPENDENCIES] ?? [];
      if (deps.length > 0) {
        await this.waitForWorkloads(jobId, deps as string[]);
      }

      const mappings = await this.prisma.identityMapping.findMany({
        where: {
          jobId,
          status: { in: ['AUTO_MATCHED', 'MANUALLY_MATCHED', 'CREATED_IN_DEST'] },
          objectType: { in: this.getObjectTypesForWorkload(workload) as any[] },
        },
      });

      const queue = this.workloadQueues.get(workload.toLowerCase());
      if (!queue) continue;

      for (const mapping of mappings) {
        // Create a task for each mapping
        const task = await this.prisma.migrationTask.create({
          data: {
            jobId,
            workload: workload as any,
            taskType: mapping.objectType.toLowerCase(),
            sourceObjectId: mapping.sourceId,
            sourceObjectName: mapping.sourceIdentifier,
            destObjectId: mapping.destinationId,
          },
        });

        await queue.add(`migrate-${mapping.objectType.toLowerCase()}`, {
          ...data,
          taskId: task.id,
          workload,
          taskType: mapping.objectType.toLowerCase(),
          sourceObjectId: mapping.sourceId,
          destObjectId: mapping.destinationId,
          options: {
            batchSize: 100,
            skipExisting: true,
            includePermissions: true,
            includeVersionHistory: false,
            deltaSync: false,
          },
        });
      }

      this.logger.info({ jobId, workload, taskCount: mappings.length }, 'Tasks enqueued for workload');
    }
  }

  private async runValidation(data: OrchestratorJobPayload): Promise<void> {
    const { jobId } = data;
    this.logger.info({ jobId }, 'Starting validation phase');

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { currentPhase: 'VALIDATION' },
    });

    // Count completed vs total tasks
    const tasks = await this.prisma.migrationTask.groupBy({
      by: ['status'],
      where: { jobId },
      _count: true,
    });

    const total = tasks.reduce((sum, t) => sum + t._count, 0);
    const completed = tasks.find((t) => t.status === 'COMPLETED')?._count ?? 0;
    const failed = tasks.find((t) => t.status === 'FAILED')?._count ?? 0;

    const finalStatus = failed > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';

    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        currentPhase: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await this.publishProgress(jobId, 'job.completed', { finalStatus, total, completed, failed });

    // Dispatch webhooks for completion
    const webhookEvent = finalStatus === 'COMPLETED' ? 'migration.completed' : 'migration.completed_with_errors';
    this.dispatchWebhookEvent(data.organizationId, webhookEvent, {
      jobId,
      finalStatus,
      total,
      completed,
      failed,
    }).catch(() => {});

    this.logger.info({ jobId, total, completed, failed, finalStatus }, 'Migration completed');
  }

  private async advancePhase(data: OrchestratorJobPayload, nextPhase: string): Promise<void> {
    const orchestratorQueue = new Queue('orchestrator', { connection: this.redis });
    await orchestratorQueue.add('advance-phase', { ...data, phase: nextPhase });
    await orchestratorQueue.close();
  }

  private async waitForWorkloads(jobId: string, workloads: string[]): Promise<void> {
    const maxWait = 24 * 60 * 60 * 1000; // 24 hours

    // Check if already done
    const checkPending = () =>
      this.prisma.migrationTask.count({
        where: {
          jobId,
          workload: { in: workloads as any[] },
          status: { in: ['PENDING', 'QUEUED', 'IN_PROGRESS'] },
        },
      });

    const pending = await checkPending();
    if (pending === 0) return;

    // Subscribe to progress events, with fallback polling every 30s
    return new Promise<void>((resolve, reject) => {
      const Redis = require('ioredis');
      const sub = new Redis({
        host: this.redis.options.host,
        port: this.redis.options.port,
        password: this.redis.options.password,
        tls: this.redis.options.tls,
        maxRetriesPerRequest: null,
      });

      const channel = `migration:progress:${jobId}`;
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        clearInterval(fallbackPoll);
        clearTimeout(timeout);
        sub.unsubscribe();
        sub.disconnect();
      };

      const checkAndResolve = async () => {
        if (resolved) return;
        const count = await checkPending();
        if (count === 0) {
          cleanup();
          resolve();
        }
      };

      sub.subscribe(channel);
      sub.on('message', () => {
        checkAndResolve().catch(() => {});
      });

      // Fallback: poll every 30s in case pub/sub events are missed
      const fallbackPoll = setInterval(() => {
        checkAndResolve().catch(() => {});
      }, 30000);

      // Timeout
      const timeout = setTimeout(() => {
        cleanup();
        this.logger.warn({ jobId, workloads }, 'Timeout waiting for workloads');
        resolve(); // Don't block forever — let orchestrator proceed
      }, maxWait);
    });
  }

  private resolveWorkloadOrder(workloads: string[]): string[] {
    const ordered: string[] = [];
    const visited = new Set<string>();

    const visit = (wl: string) => {
      if (visited.has(wl)) return;
      visited.add(wl);
      const deps = WORKLOAD_DEPENDENCIES[wl as keyof typeof WORKLOAD_DEPENDENCIES] ?? [];
      for (const dep of deps) {
        if (workloads.includes(dep)) visit(dep);
      }
      ordered.push(wl);
    };

    for (const wl of workloads) visit(wl);
    return ordered;
  }

  private getObjectTypesForWorkload(workload: string): string[] {
    switch (workload) {
      case 'ENTRA_ID': return ['USER'];
      case 'GROUPS': return ['GROUP', 'SECURITY_GROUP', 'DISTRIBUTION_LIST'];
      case 'EXCHANGE': return ['USER', 'SHARED_MAILBOX'];
      case 'ONEDRIVE': return ['USER'];
      case 'SHAREPOINT': return ['SITE'];
      case 'TEAMS': return ['TEAM'];
      case 'PLANNER': return ['PLAN'];
      default: return [];
    }
  }
}
