import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { MigrationTaskPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';

export class GroupsProcessor extends BaseProcessor<MigrationTaskPayload> {
  readonly queueName = 'groups';
  readonly concurrency = 8;

  async process(job: Job<MigrationTaskPayload>): Promise<void> {
    const { taskId, jobId, sourceTenantId, destTenantId, sourceObjectId, destObjectId, taskType } = job.data;

    await this.updateTaskProgress(taskId, { status: 'IN_PROGRESS' });

    const sourceGraph = await this.createGraphClient(sourceTenantId);
    const destGraph = await this.createGraphClient(destTenantId);

    try {
      if (destObjectId) {
        // Group exists in dest — sync members
        await this.syncGroupMembers(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId);
      } else {
        // Group doesn't exist — create it
        const newGroupId = await this.createGroup(jobId, taskId, sourceGraph, destGraph, sourceObjectId);
        if (newGroupId) {
          // Update mapping with created group ID
          await this.prisma.identityMapping.updateMany({
            where: { jobId, sourceId: sourceObjectId },
            data: { destinationId: newGroupId, status: 'CREATED_IN_DEST', matchStrategy: 'AUTO_CREATED' },
          });
          await this.syncGroupMembers(jobId, taskId, sourceGraph, destGraph, sourceObjectId, newGroupId);
        }
      }

      await this.updateTaskProgress(taskId, { status: 'COMPLETED', progressPercent: 100 });
    } catch (error) {
      this.logger.error({ taskId, error }, 'Groups migration failed');
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      throw error;
    }

    await this.updateJobProgress(jobId);
  }

  private async createGroup(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceGroupId: string,
  ): Promise<string | null> {
    // Get source group details
    const sourceGroup = await source.request<any>(
      `/groups/${sourceGroupId}?$select=displayName,description,mailEnabled,mailNickname,securityEnabled,groupTypes,visibility`,
    );

    try {
      const created = await dest.request<any>('/groups', {
        method: 'POST',
        body: {
          displayName: sourceGroup.displayName,
          description: sourceGroup.description,
          mailEnabled: sourceGroup.mailEnabled,
          mailNickname: sourceGroup.mailNickname ?? sourceGroup.displayName.toLowerCase().replace(/\s+/g, '-'),
          securityEnabled: sourceGroup.securityEnabled,
          groupTypes: sourceGroup.groupTypes,
          visibility: sourceGroup.visibility,
        },
      });
      return created.id;
    } catch (error) {
      await this.logError(taskId, {
        itemId: sourceGroupId,
        itemName: sourceGroup.displayName,
        itemType: 'group',
        errorCode: 'CREATE_GROUP_FAILED',
        errorMessage: String(error),
        retryable: true,
      });
      return null;
    }
  }

  private async syncGroupMembers(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceGroupId: string, destGroupId: string,
  ): Promise<void> {
    // Get source members
    const members: any[] = [];
    for await (const batch of source.paginate<any>(
      `/groups/${sourceGroupId}/members?$select=id,displayName,userPrincipalName&$top=100`,
    )) {
      members.push(...batch);
    }

    // Get source owners
    const owners: any[] = [];
    for await (const batch of source.paginate<any>(
      `/groups/${sourceGroupId}/owners?$select=id,displayName,userPrincipalName&$top=100`,
    )) {
      owners.push(...batch);
    }

    // Add members to destination group
    for (const member of members) {
      const destUserId = await this.resolveMapping(jobId, 'USER', member.id);
      if (!destUserId) continue;

      try {
        await dest.request(`/groups/${destGroupId}/members/$ref`, {
          method: 'POST',
          body: { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${destUserId}` },
        });
      } catch {
        // Member may already exist
      }
    }

    // Add owners
    for (const owner of owners) {
      const destUserId = await this.resolveMapping(jobId, 'USER', owner.id);
      if (!destUserId) continue;

      try {
        await dest.request(`/groups/${destGroupId}/owners/$ref`, {
          method: 'POST',
          body: { '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${destUserId}` },
        });
      } catch {
        // Owner may already exist
      }
    }

    this.logger.info(
      { taskId, members: members.length, owners: owners.length },
      'Group members synced',
    );
  }
}
