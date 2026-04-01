import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { MigrationTaskPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';

export class TeamsProcessor extends BaseProcessor<MigrationTaskPayload> {
  readonly queueName = 'teams';
  readonly concurrency = 6;

  async process(job: Job<MigrationTaskPayload>): Promise<void> {
    const { taskId, jobId, sourceTenantId, destTenantId, sourceObjectId, destObjectId } = job.data;

    if (!destObjectId) {
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      return;
    }

    await this.updateTaskProgress(taskId, { status: 'IN_PROGRESS' });

    const sourceGraph = await this.createGraphClient(sourceTenantId);
    const destGraph = await this.createGraphClient(destTenantId);

    try {
      await this.migrateTeam(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId);
      await this.updateTaskProgress(taskId, { status: 'COMPLETED', progressPercent: 100 });
    } catch (error) {
      this.logger.error({ taskId, error }, 'Teams migration failed');
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      throw error;
    }

    await this.updateJobProgress(jobId);
  }

  private async migrateTeam(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceTeamId: string, destTeamId: string,
  ): Promise<void> {
    this.logger.info({ taskId, sourceTeamId, destTeamId }, 'Migrating Teams data');

    // Get source channels
    const sourceChannels = await source.request<{ value: any[] }>(
      `/teams/${sourceTeamId}/channels?$select=id,displayName,description,membershipType`,
    );

    for (const channel of sourceChannels.value) {
      this.logger.info({ taskId, channel: channel.displayName }, 'Migrating channel');

      let destChannelId: string;

      if (channel.displayName === 'General') {
        // General channel always exists
        const destChannels = await dest.request<{ value: any[] }>(
          `/teams/${destTeamId}/channels?$filter=displayName eq 'General'&$select=id`,
        );
        destChannelId = destChannels.value[0]?.id;
        if (!destChannelId) continue;
      } else {
        // Create channel in destination
        try {
          const created = await dest.request<any>(`/teams/${destTeamId}/channels`, {
            method: 'POST',
            body: {
              displayName: channel.displayName,
              description: channel.description,
              membershipType: channel.membershipType ?? 'standard',
            },
          });
          destChannelId = created.id;
        } catch (error) {
          await this.logError(taskId, {
            itemId: channel.id,
            itemName: channel.displayName,
            itemType: 'channel',
            errorCode: 'CREATE_CHANNEL_FAILED',
            errorMessage: String(error),
            retryable: true,
          });
          continue;
        }
      }

      // Migrate channel messages using Teams Migration Mode
      // Note: Requires Teamwork.Migrate.All permission
      await this.migrateChannelMessages(
        taskId, source, dest,
        sourceTeamId, channel.id,
        destTeamId, destChannelId,
        jobId,
      );
    }

    // Migrate team members
    await this.migrateTeamMembers(jobId, taskId, source, dest, sourceTeamId, destTeamId);
  }

  private async migrateChannelMessages(
    taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceTeamId: string, sourceChannelId: string,
    destTeamId: string, destChannelId: string,
    jobId: string,
  ): Promise<void> {
    try {
      for await (const messages of source.paginate<any>(
        `/teams/${sourceTeamId}/channels/${sourceChannelId}/messages?$top=50`,
      )) {
        for (const msg of messages) {
          if (msg.messageType !== 'message') continue; // Skip system messages

          try {
            // Resolve the sender to destination user
            const destUserId = msg.from?.user?.id
              ? await this.resolveMapping(jobId, 'USER', msg.from.user.id)
              : null;

            // Use migration mode to preserve original timestamps
            await dest.request(
              `/teams/${destTeamId}/channels/${destChannelId}/messages`,
              {
                method: 'POST',
                body: {
                  createdDateTime: msg.createdDateTime,
                  from: destUserId
                    ? { user: { id: destUserId, displayName: msg.from?.user?.displayName } }
                    : msg.from,
                  body: msg.body,
                  importance: msg.importance,
                  subject: msg.subject,
                },
              },
            );

            // Migrate replies
            if (msg.id) {
              await this.migrateReplies(
                taskId, source, dest,
                sourceTeamId, sourceChannelId, msg.id,
                destTeamId, destChannelId, msg.id,
                jobId,
              );
            }
          } catch (error) {
            await this.logError(taskId, {
              itemId: msg.id,
              itemName: msg.body?.content?.substring(0, 100),
              itemType: 'message',
              errorCode: 'MSG_MIGRATION_FAILED',
              errorMessage: String(error),
              retryable: true,
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn({ taskId, sourceChannelId, error }, 'Failed to migrate channel messages');
    }
  }

  private async migrateReplies(
    taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceTeamId: string, sourceChannelId: string, sourceMessageId: string,
    destTeamId: string, destChannelId: string, destMessageId: string,
    jobId: string,
  ): Promise<void> {
    try {
      for await (const replies of source.paginate<any>(
        `/teams/${sourceTeamId}/channels/${sourceChannelId}/messages/${sourceMessageId}/replies?$top=50`,
      )) {
        for (const reply of replies) {
          const destUserId = reply.from?.user?.id
            ? await this.resolveMapping(jobId, 'USER', reply.from.user.id)
            : null;

          try {
            await dest.request(
              `/teams/${destTeamId}/channels/${destChannelId}/messages/${destMessageId}/replies`,
              {
                method: 'POST',
                body: {
                  createdDateTime: reply.createdDateTime,
                  from: destUserId
                    ? { user: { id: destUserId, displayName: reply.from?.user?.displayName } }
                    : reply.from,
                  body: reply.body,
                },
              },
            );
          } catch {
            // Skip failed replies
          }
        }
      }
    } catch {
      // Channel may not have replies
    }
  }

  private async migrateTeamMembers(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceTeamId: string, destTeamId: string,
  ): Promise<void> {
    try {
      const members = await source.request<{ value: any[] }>(
        `/teams/${sourceTeamId}/members?$select=id,displayName,roles,userId`,
      );

      for (const member of members.value) {
        const destUserId = member.userId
          ? await this.resolveMapping(jobId, 'USER', member.userId)
          : null;

        if (!destUserId) continue;

        try {
          await dest.request(`/teams/${destTeamId}/members`, {
            method: 'POST',
            body: {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${destUserId}')`,
              roles: member.roles,
            },
          });
        } catch {
          // Member may already exist
        }
      }
    } catch (error) {
      this.logger.warn({ taskId, error }, 'Failed to migrate team members');
    }
  }
}
