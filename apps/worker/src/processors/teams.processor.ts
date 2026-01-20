import { Job } from 'bullmq';
import { BaseProcessor, MigrationJobData, ProcessorResult } from './base.processor';

interface Team {
  id: string;
  displayName: string;
  description: string;
  visibility: string;
}

interface Channel {
  id: string;
  displayName: string;
  description: string;
  membershipType: string;
}

export class TeamsProcessor extends BaseProcessor {
  async process(job: Job<MigrationJobData>): Promise<ProcessorResult> {
    const { sourceTenantId, destinationTenantId, sourceId, taskId } = job.data;

    this.logger.info({ taskId, sourceId }, 'Starting Teams migration');

    const result: ProcessorResult = {
      success: true,
      itemsProcessed: 0,
      itemsFailed: 0,
      bytesTransferred: 0,
      errors: [],
    };

    try {
      const sourceClient = await this.getGraphClient(sourceTenantId);
      const destClient = await this.getGraphClient(destinationTenantId);

      // Get the team from source
      const sourceTeam = await this.getTeam(sourceClient, sourceId);
      this.logger.info({ team: sourceTeam.displayName }, 'Found source team');

      // Create team in destination
      const destTeam = await this.createOrGetTeam(destClient, sourceTeam);
      this.logger.info({ team: destTeam.displayName, id: destTeam.id }, 'Destination team ready');

      // Get channels
      const channels = await this.getChannels(sourceClient, sourceId);
      this.logger.info({ channelCount: channels.length }, 'Found channels');

      // Migrate each channel
      for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];

        try {
          // Create channel in destination
          const destChannel = await this.createOrGetChannel(destClient, destTeam.id, channel);

          // Migrate messages (using Teams export API or Migration Mode)
          const messagesResult = await this.migrateChannelMessages(
            sourceClient,
            destClient,
            sourceId,
            destTeam.id,
            channel.id,
            destChannel.id,
            job,
          );

          result.itemsProcessed += messagesResult.processed;
          result.itemsFailed += messagesResult.failed;

          // Migrate channel files
          const filesResult = await this.migrateChannelFiles(
            sourceClient,
            destClient,
            sourceId,
            destTeam.id,
            channel.id,
            destChannel.id,
            job,
          );

          result.itemsProcessed += filesResult.processed;
          result.itemsFailed += filesResult.failed;
          result.bytesTransferred += filesResult.bytesTransferred;

          // Update progress
          const progress = Math.round(((i + 1) / channels.length) * 100);
          await job.updateProgress(progress);

        } catch (error: any) {
          this.logger.error({ channel: channel.displayName, error: error.message }, 'Failed to migrate channel');
          result.errors.push(`Failed to migrate channel ${channel.displayName}: ${error.message}`);
        }
      }

      // Migrate team members
      const membersResult = await this.migrateTeamMembers(sourceClient, destClient, sourceId, destTeam.id);
      result.itemsProcessed += membersResult.processed;
      result.itemsFailed += membersResult.failed;

      // Migrate Planner tasks if associated
      const plannerResult = await this.migratePlanner(sourceClient, destClient, sourceId, destTeam.id);
      result.itemsProcessed += plannerResult.processed;
      result.itemsFailed += plannerResult.failed;

      result.success = result.itemsFailed === 0;

    } catch (error: any) {
      this.logger.error({ taskId, error: error.message }, 'Teams migration failed');
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  private async getTeam(client: any, teamId: string): Promise<Team> {
    return this.retryWithBackoff(async () => {
      return client.api(`/teams/${teamId}`).get();
    });
  }

  private async createOrGetTeam(client: any, sourceTeam: Team): Promise<Team> {
    // Check if team with same name exists
    const existingTeams = await this.retryWithBackoff(async () => {
      return client
        .api('/groups')
        .filter(`displayName eq '${sourceTeam.displayName}' and resourceProvisioningOptions/any(x:x eq 'Team')`)
        .get();
    });

    if (existingTeams.value.length > 0) {
      const groupId = existingTeams.value[0].id;
      return this.retryWithBackoff(async () => {
        return client.api(`/teams/${groupId}`).get();
      });
    }

    // Create new team
    const newTeam = await this.retryWithBackoff(async () => {
      return client.api('/teams').post({
        'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
        displayName: sourceTeam.displayName,
        description: sourceTeam.description,
        visibility: sourceTeam.visibility,
      });
    });

    // Wait for team provisioning
    await this.delay(10000);

    return newTeam;
  }

  private async getChannels(client: any, teamId: string): Promise<Channel[]> {
    const response = await this.retryWithBackoff(async () => {
      return client.api(`/teams/${teamId}/channels`).get();
    });
    return response.value;
  }

  private async createOrGetChannel(client: any, teamId: string, sourceChannel: Channel): Promise<Channel> {
    // Skip the "General" channel as it's created automatically
    if (sourceChannel.displayName === 'General') {
      const channels = await this.retryWithBackoff(async () => {
        return client.api(`/teams/${teamId}/channels`).get();
      });
      return channels.value.find((c: Channel) => c.displayName === 'General');
    }

    // Check if channel exists
    const existingChannels = await this.retryWithBackoff(async () => {
      return client.api(`/teams/${teamId}/channels`).get();
    });

    const existing = existingChannels.value.find((c: Channel) => c.displayName === sourceChannel.displayName);
    if (existing) {
      return existing;
    }

    // Create new channel
    return this.retryWithBackoff(async () => {
      return client.api(`/teams/${teamId}/channels`).post({
        displayName: sourceChannel.displayName,
        description: sourceChannel.description,
        membershipType: sourceChannel.membershipType || 'standard',
      });
    });
  }

  private async migrateChannelMessages(
    sourceClient: any,
    destClient: any,
    sourceTeamId: string,
    destTeamId: string,
    sourceChannelId: string,
    destChannelId: string,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    this.logger.info({ sourceChannelId }, 'Migrating channel messages');

    // Note: In production, you would use the Teams Migration Mode API
    // which allows bulk import of historical messages.
    // This requires special permissions and rate limits.

    let nextLink: string | undefined;

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return sourceClient.api(nextLink).get();
        }
        return sourceClient
          .api(`/teams/${sourceTeamId}/channels/${sourceChannelId}/messages`)
          .top(50)
          .get();
      });

      for (const message of response.value) {
        // Skip system messages
        if (message.messageType !== 'message') {
          continue;
        }

        try {
          // Note: Regular API doesn't allow setting timestamps
          // Migration Mode API would be used in production
          await this.retryWithBackoff(async () => {
            await destClient.api(`/teams/${destTeamId}/channels/${destChannelId}/messages`).post({
              body: message.body,
            });
          });

          // Migrate replies
          if (message.replies && message.replies.length > 0) {
            for (const reply of message.replies) {
              await this.retryWithBackoff(async () => {
                await destClient
                  .api(`/teams/${destTeamId}/channels/${destChannelId}/messages/${message.id}/replies`)
                  .post({
                    body: reply.body,
                  });
              });
            }
          }

          processed++;

          // Rate limiting for Teams API (very strict)
          await this.delay(1000);

        } catch (error: any) {
          this.logger.error({ messageId: message.id, error: error.message }, 'Failed to migrate message');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed };
  }

  private async migrateChannelFiles(
    sourceClient: any,
    destClient: any,
    sourceTeamId: string,
    destTeamId: string,
    sourceChannelId: string,
    destChannelId: string,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number; bytesTransferred: number }> {
    let processed = 0;
    let failed = 0;
    let bytesTransferred = 0;

    this.logger.info({ sourceChannelId }, 'Migrating channel files');

    try {
      // Get source channel's files folder
      const sourceFolder = await this.retryWithBackoff(async () => {
        return sourceClient.api(`/teams/${sourceTeamId}/channels/${sourceChannelId}/filesFolder`).get();
      });

      // Get destination channel's files folder
      const destFolder = await this.retryWithBackoff(async () => {
        return destClient.api(`/teams/${destTeamId}/channels/${destChannelId}/filesFolder`).get();
      });

      // Get files from source
      const response = await this.retryWithBackoff(async () => {
        return sourceClient
          .api(`/drives/${sourceFolder.parentReference.driveId}/items/${sourceFolder.id}/children`)
          .get();
      });

      for (const item of response.value) {
        if (item.file) {
          try {
            // Download file
            const content = await this.retryWithBackoff(async () => {
              return sourceClient
                .api(`/drives/${sourceFolder.parentReference.driveId}/items/${item.id}/content`)
                .get();
            });

            // Upload to destination
            await this.retryWithBackoff(async () => {
              await destClient
                .api(`/drives/${destFolder.parentReference.driveId}/items/${destFolder.id}:/${item.name}:/content`)
                .put(content);
            });

            processed++;
            bytesTransferred += item.size || 0;

          } catch (error: any) {
            this.logger.error({ fileName: item.name, error: error.message }, 'Failed to migrate file');
            failed++;
          }
        }
      }

    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to migrate channel files');
    }

    return { processed, failed, bytesTransferred };
  }

  private async migrateTeamMembers(
    sourceClient: any,
    destClient: any,
    sourceTeamId: string,
    destTeamId: string,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    this.logger.info('Migrating team members');

    const members = await this.retryWithBackoff(async () => {
      return sourceClient.api(`/teams/${sourceTeamId}/members`).get();
    });

    for (const member of members.value) {
      try {
        await this.retryWithBackoff(async () => {
          await destClient.api(`/teams/${destTeamId}/members`).post({
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: member.roles,
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${member.userId}')`,
          });
        });
        processed++;
      } catch (error: any) {
        // Member might already exist
        if (!error.message?.includes('already exists')) {
          this.logger.error({ userId: member.userId, error: error.message }, 'Failed to add member');
          failed++;
        }
      }
    }

    return { processed, failed };
  }

  private async migratePlanner(
    sourceClient: any,
    destClient: any,
    sourceTeamId: string,
    destTeamId: string,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    this.logger.info('Migrating Planner tasks');

    try {
      // Get plans associated with the team's group
      const plans = await this.retryWithBackoff(async () => {
        return sourceClient.api(`/groups/${sourceTeamId}/planner/plans`).get();
      });

      for (const plan of plans.value) {
        try {
          // Create plan in destination
          const destPlan = await this.retryWithBackoff(async () => {
            return destClient.api('/planner/plans').post({
              owner: destTeamId,
              title: plan.title,
            });
          });

          // Get and create buckets
          const buckets = await this.retryWithBackoff(async () => {
            return sourceClient.api(`/planner/plans/${plan.id}/buckets`).get();
          });

          const bucketMap = new Map();
          for (const bucket of buckets.value) {
            const destBucket = await this.retryWithBackoff(async () => {
              return destClient.api('/planner/buckets').post({
                name: bucket.name,
                planId: destPlan.id,
                orderHint: bucket.orderHint,
              });
            });
            bucketMap.set(bucket.id, destBucket.id);
          }

          // Get and create tasks
          const tasks = await this.retryWithBackoff(async () => {
            return sourceClient.api(`/planner/plans/${plan.id}/tasks`).get();
          });

          for (const task of tasks.value) {
            await this.retryWithBackoff(async () => {
              await destClient.api('/planner/tasks').post({
                planId: destPlan.id,
                bucketId: bucketMap.get(task.bucketId),
                title: task.title,
                percentComplete: task.percentComplete,
                dueDateTime: task.dueDateTime,
                orderHint: task.orderHint,
              });
            });
            processed++;
          }

        } catch (error: any) {
          this.logger.error({ planId: plan.id, error: error.message }, 'Failed to migrate plan');
          failed++;
        }
      }

    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to get Planner plans');
    }

    return { processed, failed };
  }
}
