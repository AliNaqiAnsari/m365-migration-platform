import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { MigrationTaskPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';

export class PlannerProcessor extends BaseProcessor<MigrationTaskPayload> {
  readonly queueName = 'planner';
  readonly concurrency = 4;

  async process(job: Job<MigrationTaskPayload>): Promise<void> {
    const { taskId, jobId, sourceTenantId, destTenantId, sourceObjectId, destObjectId } = job.data;

    await this.updateTaskProgress(taskId, { status: 'IN_PROGRESS' });

    const sourceGraph = await this.createGraphClient(sourceTenantId);
    const destGraph = await this.createGraphClient(destTenantId);

    try {
      await this.migratePlan(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId ?? null);
      await this.updateTaskProgress(taskId, { status: 'COMPLETED', progressPercent: 100 });
    } catch (error) {
      this.logger.error({ taskId, error }, 'Planner migration failed');
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      throw error;
    }

    await this.updateJobProgress(jobId);
  }

  private async migratePlan(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourcePlanId: string, destGroupId: string | null,
  ): Promise<void> {
    // Get source plan details
    const sourcePlan = await source.request<any>(
      `/planner/plans/${sourcePlanId}?$select=id,title,owner`,
    );

    // Resolve destination group for the plan
    const resolvedGroupId = destGroupId ?? await this.resolveMapping(jobId, 'GROUP', sourcePlan.owner);
    if (!resolvedGroupId) {
      await this.logError(taskId, {
        itemId: sourcePlanId,
        itemName: sourcePlan.title,
        itemType: 'plan',
        errorCode: 'NO_DEST_GROUP',
        errorMessage: 'Cannot create plan: destination group not mapped',
      });
      return;
    }

    // Create plan in destination
    let destPlanId: string;
    try {
      const created = await dest.request<any>('/planner/plans', {
        method: 'POST',
        body: {
          owner: resolvedGroupId,
          title: sourcePlan.title,
        },
      });
      destPlanId = created.id;
    } catch (error) {
      await this.logError(taskId, {
        itemId: sourcePlanId,
        itemName: sourcePlan.title,
        itemType: 'plan',
        errorCode: 'CREATE_PLAN_FAILED',
        errorMessage: String(error),
        retryable: true,
      });
      return;
    }

    // Migrate buckets
    const buckets = await source.request<{ value: any[] }>(
      `/planner/plans/${sourcePlanId}/buckets?$select=id,name,orderHint`,
    );

    const bucketMap = new Map<string, string>();
    for (const bucket of buckets.value) {
      try {
        const created = await dest.request<any>('/planner/buckets', {
          method: 'POST',
          body: {
            name: bucket.name,
            planId: destPlanId,
            orderHint: bucket.orderHint,
          },
        });
        bucketMap.set(bucket.id, created.id);
      } catch (error) {
        this.logger.warn({ bucket: bucket.name, error }, 'Failed to create bucket');
      }
    }

    // Migrate tasks
    const tasks = await source.request<{ value: any[] }>(
      `/planner/plans/${sourcePlanId}/tasks?$select=id,title,bucketId,percentComplete,startDateTime,dueDateTime,priority,assignments,orderHint`,
    );

    for (const task of tasks.value) {
      const destBucketId = bucketMap.get(task.bucketId);

      // Resolve task assignees
      const assignments: Record<string, any> = {};
      if (task.assignments) {
        for (const [userId, assignment] of Object.entries(task.assignments)) {
          const destUserId = await this.resolveMapping(jobId, 'USER', userId);
          if (destUserId) {
            assignments[destUserId] = assignment;
          }
        }
      }

      try {
        const created = await dest.request<any>('/planner/tasks', {
          method: 'POST',
          body: {
            planId: destPlanId,
            bucketId: destBucketId ?? undefined,
            title: task.title,
            percentComplete: task.percentComplete,
            startDateTime: task.startDateTime,
            dueDateTime: task.dueDateTime,
            priority: task.priority,
            assignments: Object.keys(assignments).length > 0 ? assignments : undefined,
            orderHint: task.orderHint,
          },
        });

        // Migrate task details (description, checklist, references)
        try {
          const details = await source.request<any>(`/planner/tasks/${task.id}/details`);
          if (details.description || details.checklist || details.references) {
            await dest.request(`/planner/tasks/${created.id}/details`, {
              method: 'PATCH',
              body: {
                description: details.description,
                checklist: details.checklist,
                references: details.references,
              },
              headers: { 'If-Match': created['@odata.etag'] ?? '*' },
            });
          }
        } catch {
          // Details may fail — non-critical
        }
      } catch (error) {
        await this.logError(taskId, {
          itemId: task.id,
          itemName: task.title,
          itemType: 'planner_task',
          errorCode: 'TASK_MIGRATION_FAILED',
          errorMessage: String(error),
          retryable: true,
        });
      }
    }

    this.logger.info(
      { taskId, buckets: buckets.value.length, tasks: tasks.value.length },
      'Planner migration complete',
    );
  }
}
