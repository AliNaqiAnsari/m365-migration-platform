import { Job } from 'bullmq';
import { BaseProcessor, ProcessorResult } from './base.processor';

interface BackupJobData {
  jobId: string;
  organizationId: string;
  tenantId: string;
  backupType: 'full' | 'incremental' | 'differential';
  workloads: string[];
  scope: {
    users?: string[];
    sites?: string[];
    teams?: string[];
  };
  options: Record<string, any>;
  lastDeltaToken?: string;
}

export class BackupProcessor extends BaseProcessor {
  async process(job: Job<BackupJobData>): Promise<ProcessorResult> {
    const { jobId, tenantId, backupType, workloads } = job.data;

    this.logger.info({ jobId, tenantId, backupType, workloads }, 'Starting backup job');

    const result: ProcessorResult = {
      success: true,
      itemsProcessed: 0,
      itemsFailed: 0,
      bytesTransferred: 0,
      errors: [],
    };

    try {
      const client = await this.getGraphClient(tenantId);

      for (const workload of workloads) {
        try {
          let workloadResult: { processed: number; failed: number; bytes: number };

          switch (workload) {
            case 'exchange':
              workloadResult = await this.backupExchange(client, job);
              break;
            case 'onedrive':
              workloadResult = await this.backupOneDrive(client, job);
              break;
            case 'sharepoint':
              workloadResult = await this.backupSharePoint(client, job);
              break;
            case 'teams':
              workloadResult = await this.backupTeams(client, job);
              break;
            default:
              this.logger.warn({ workload }, 'Unknown workload type');
              continue;
          }

          result.itemsProcessed += workloadResult.processed;
          result.itemsFailed += workloadResult.failed;
          result.bytesTransferred += workloadResult.bytes;

        } catch (error: any) {
          this.logger.error({ workload, error: error.message }, 'Failed to backup workload');
          result.errors.push(`Failed to backup ${workload}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;

    } catch (error: any) {
      this.logger.error({ jobId, error: error.message }, 'Backup job failed');
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  private async backupExchange(
    client: any,
    job: Job<BackupJobData>,
  ): Promise<{ processed: number; failed: number; bytes: number }> {
    let processed = 0;
    let failed = 0;
    let bytes = 0;

    const { scope, backupType, lastDeltaToken } = job.data;
    const users = scope.users || [];

    this.logger.info({ userCount: users.length, backupType }, 'Backing up Exchange data');

    for (const userId of users) {
      try {
        // Use delta queries for incremental backups
        const endpoint = backupType === 'incremental' && lastDeltaToken
          ? `/users/${userId}/messages/delta?$deltatoken=${lastDeltaToken}`
          : `/users/${userId}/messages/delta`;

        let nextLink: string | undefined = endpoint;

        while (nextLink) {
          const response = await this.retryWithBackoff(async () => {
            return client.api(nextLink!).get();
          });

          for (const message of response.value) {
            try {
              // In production, this would save to Azure Blob Storage
              const messageData = JSON.stringify(message);
              bytes += messageData.length;
              processed++;
            } catch (error: any) {
              failed++;
            }
          }

          // Get next page or delta link
          nextLink = response['@odata.nextLink'];

          if (response['@odata.deltaLink']) {
            // Store delta link for next incremental backup
            // await this.storeDeltaToken(job.data.jobId, 'exchange', userId, response['@odata.deltaLink']);
          }
        }

        // Backup calendar events
        const calendarResult = await this.backupUserCalendar(client, userId);
        processed += calendarResult.processed;
        failed += calendarResult.failed;
        bytes += calendarResult.bytes;

        // Backup contacts
        const contactsResult = await this.backupUserContacts(client, userId);
        processed += contactsResult.processed;
        failed += contactsResult.failed;
        bytes += contactsResult.bytes;

      } catch (error: any) {
        this.logger.error({ userId, error: error.message }, 'Failed to backup user mailbox');
        failed++;
      }
    }

    return { processed, failed, bytes };
  }

  private async backupUserCalendar(
    client: any,
    userId: string,
  ): Promise<{ processed: number; failed: number; bytes: number }> {
    let processed = 0;
    let failed = 0;
    let bytes = 0;

    let nextLink: string | undefined;

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return client.api(nextLink).get();
        }
        return client.api(`/users/${userId}/calendar/events`).top(100).get();
      });

      for (const event of response.value) {
        try {
          const eventData = JSON.stringify(event);
          bytes += eventData.length;
          processed++;
        } catch {
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed, bytes };
  }

  private async backupUserContacts(
    client: any,
    userId: string,
  ): Promise<{ processed: number; failed: number; bytes: number }> {
    let processed = 0;
    let failed = 0;
    let bytes = 0;

    let nextLink: string | undefined;

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return client.api(nextLink).get();
        }
        return client.api(`/users/${userId}/contacts`).top(100).get();
      });

      for (const contact of response.value) {
        try {
          const contactData = JSON.stringify(contact);
          bytes += contactData.length;
          processed++;
        } catch {
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed, bytes };
  }

  private async backupOneDrive(
    client: any,
    job: Job<BackupJobData>,
  ): Promise<{ processed: number; failed: number; bytes: number }> {
    let processed = 0;
    let failed = 0;
    let bytes = 0;

    const { scope, backupType } = job.data;
    const users = scope.users || [];

    this.logger.info({ userCount: users.length }, 'Backing up OneDrive data');

    for (const userId of users) {
      try {
        const drive = await this.retryWithBackoff(async () => {
          return client.api(`/users/${userId}/drive`).get();
        });

        // Backup drive contents recursively
        const result = await this.backupDriveFolder(client, drive.id, 'root');
        processed += result.processed;
        failed += result.failed;
        bytes += result.bytes;

      } catch (error: any) {
        this.logger.error({ userId, error: error.message }, 'Failed to backup OneDrive');
        failed++;
      }
    }

    return { processed, failed, bytes };
  }

  private async backupDriveFolder(
    client: any,
    driveId: string,
    folderId: string,
  ): Promise<{ processed: number; failed: number; bytes: number }> {
    let processed = 0;
    let failed = 0;
    let bytes = 0;
    let nextLink: string | undefined;

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return client.api(nextLink).get();
        }
        return client.api(`/drives/${driveId}/items/${folderId}/children`).top(100).get();
      });

      for (const item of response.value) {
        try {
          if (item.folder) {
            // Recursively backup folder contents
            const folderResult = await this.backupDriveFolder(client, driveId, item.id);
            processed += folderResult.processed;
            failed += folderResult.failed;
            bytes += folderResult.bytes;
          } else if (item.file) {
            // Download and store file
            const content = await this.retryWithBackoff(async () => {
              return client.api(`/drives/${driveId}/items/${item.id}/content`).get();
            });

            // In production, upload to Azure Blob Storage
            bytes += item.size || 0;
            processed++;
          }
        } catch (error: any) {
          this.logger.error({ itemId: item.id, error: error.message }, 'Failed to backup item');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed, bytes };
  }

  private async backupSharePoint(
    client: any,
    job: Job<BackupJobData>,
  ): Promise<{ processed: number; failed: number; bytes: number }> {
    let processed = 0;
    let failed = 0;
    let bytes = 0;

    const { scope } = job.data;
    const sites = scope.sites || [];

    this.logger.info({ siteCount: sites.length }, 'Backing up SharePoint data');

    for (const siteId of sites) {
      try {
        // Get site drives
        const drives = await this.retryWithBackoff(async () => {
          return client.api(`/sites/${siteId}/drives`).get();
        });

        for (const drive of drives.value) {
          const driveResult = await this.backupDriveFolder(client, drive.id, 'root');
          processed += driveResult.processed;
          failed += driveResult.failed;
          bytes += driveResult.bytes;
        }

        // Backup lists
        const lists = await this.retryWithBackoff(async () => {
          return client.api(`/sites/${siteId}/lists`).get();
        });

        for (const list of lists.value) {
          if (list.system) continue;

          const items = await this.retryWithBackoff(async () => {
            return client.api(`/sites/${siteId}/lists/${list.id}/items`).expand('fields').get();
          });

          for (const item of items.value) {
            const itemData = JSON.stringify(item);
            bytes += itemData.length;
            processed++;
          }
        }

      } catch (error: any) {
        this.logger.error({ siteId, error: error.message }, 'Failed to backup site');
        failed++;
      }
    }

    return { processed, failed, bytes };
  }

  private async backupTeams(
    client: any,
    job: Job<BackupJobData>,
  ): Promise<{ processed: number; failed: number; bytes: number }> {
    let processed = 0;
    let failed = 0;
    let bytes = 0;

    const { scope } = job.data;
    const teams = scope.teams || [];

    this.logger.info({ teamCount: teams.length }, 'Backing up Teams data');

    for (const teamId of teams) {
      try {
        // Get team info
        const team = await this.retryWithBackoff(async () => {
          return client.api(`/teams/${teamId}`).get();
        });

        const teamData = JSON.stringify(team);
        bytes += teamData.length;
        processed++;

        // Get channels
        const channels = await this.retryWithBackoff(async () => {
          return client.api(`/teams/${teamId}/channels`).get();
        });

        for (const channel of channels.value) {
          // Backup channel messages
          const messages = await this.retryWithBackoff(async () => {
            return client.api(`/teams/${teamId}/channels/${channel.id}/messages`).top(50).get();
          });

          for (const message of messages.value) {
            const messageData = JSON.stringify(message);
            bytes += messageData.length;
            processed++;
          }

          // Backup channel files
          try {
            const filesFolder = await this.retryWithBackoff(async () => {
              return client.api(`/teams/${teamId}/channels/${channel.id}/filesFolder`).get();
            });

            const folderResult = await this.backupDriveFolder(
              client,
              filesFolder.parentReference.driveId,
              filesFolder.id,
            );
            processed += folderResult.processed;
            failed += folderResult.failed;
            bytes += folderResult.bytes;
          } catch {
            // Channel might not have files folder
          }
        }

        // Backup team members
        const members = await this.retryWithBackoff(async () => {
          return client.api(`/teams/${teamId}/members`).get();
        });

        for (const member of members.value) {
          const memberData = JSON.stringify(member);
          bytes += memberData.length;
          processed++;
        }

      } catch (error: any) {
        this.logger.error({ teamId, error: error.message }, 'Failed to backup team');
        failed++;
      }
    }

    return { processed, failed, bytes };
  }
}
