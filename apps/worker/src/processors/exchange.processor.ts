import { Job } from 'bullmq';
import { BaseProcessor, MigrationJobData, ProcessorResult } from './base.processor';

interface MailFolder {
  id: string;
  displayName: string;
  totalItemCount: number;
}

interface Message {
  id: string;
  subject: string;
  receivedDateTime: string;
  hasAttachments: boolean;
}

export class ExchangeProcessor extends BaseProcessor {
  async process(job: Job<MigrationJobData>): Promise<ProcessorResult> {
    const { sourceTenantId, destinationTenantId, sourceId, taskId } = job.data;

    this.logger.info({ taskId, sourceId }, 'Starting Exchange migration');

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

      // Get user's mailbox folders
      const folders = await this.getMailFolders(sourceClient, sourceId);
      const totalFolders = folders.length;

      this.logger.info({ taskId, totalFolders }, 'Found mail folders');

      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];

        try {
          // Create folder in destination
          await this.createDestinationFolder(destClient, sourceId, folder);

          // Migrate messages in folder
          const messageResult = await this.migrateMessages(
            sourceClient,
            destClient,
            sourceId,
            folder,
            job,
          );

          result.itemsProcessed += messageResult.processed;
          result.itemsFailed += messageResult.failed;
          result.bytesTransferred += messageResult.bytesTransferred;

          // Update progress
          const progress = Math.round(((i + 1) / totalFolders) * 100);
          await job.updateProgress(progress);

        } catch (error: any) {
          this.logger.error({ folder: folder.displayName, error: error.message }, 'Failed to migrate folder');
          result.errors.push(`Failed to migrate folder ${folder.displayName}: ${error.message}`);
          result.itemsFailed += folder.totalItemCount;
        }
      }

      // Migrate calendar events
      const calendarResult = await this.migrateCalendar(sourceClient, destClient, sourceId, job);
      result.itemsProcessed += calendarResult.processed;
      result.itemsFailed += calendarResult.failed;

      // Migrate contacts
      const contactsResult = await this.migrateContacts(sourceClient, destClient, sourceId, job);
      result.itemsProcessed += contactsResult.processed;
      result.itemsFailed += contactsResult.failed;

      result.success = result.itemsFailed === 0;

    } catch (error: any) {
      this.logger.error({ taskId, error: error.message }, 'Exchange migration failed');
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  private async getMailFolders(client: any, userId: string): Promise<MailFolder[]> {
    const folders: MailFolder[] = [];
    let nextLink: string | undefined;

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return client.api(nextLink).get();
        }
        return client.api(`/users/${userId}/mailFolders`).get();
      });

      folders.push(...response.value);
      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return folders;
  }

  private async createDestinationFolder(
    client: any,
    userId: string,
    folder: MailFolder,
  ): Promise<void> {
    await this.retryWithBackoff(async () => {
      await client.api(`/users/${userId}/mailFolders`).post({
        displayName: folder.displayName,
      });
    });
  }

  private async migrateMessages(
    sourceClient: any,
    destClient: any,
    userId: string,
    folder: MailFolder,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number; bytesTransferred: number }> {
    let processed = 0;
    let failed = 0;
    let bytesTransferred = 0;
    let nextLink: string | undefined;

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return sourceClient.api(nextLink).get();
        }
        return sourceClient
          .api(`/users/${userId}/mailFolders/${folder.id}/messages`)
          .select('id,subject,body,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments')
          .top(50)
          .get();
      });

      for (const message of response.value) {
        try {
          // Get full message with attachments if needed
          let fullMessage = message;
          if (message.hasAttachments) {
            fullMessage = await this.retryWithBackoff(async () => {
              return sourceClient
                .api(`/users/${userId}/messages/${message.id}`)
                .expand('attachments')
                .get();
            });
          }

          // Create message in destination
          await this.retryWithBackoff(async () => {
            await destClient.api(`/users/${userId}/mailFolders/${folder.id}/messages`).post({
              subject: fullMessage.subject,
              body: fullMessage.body,
              from: fullMessage.from,
              toRecipients: fullMessage.toRecipients,
              ccRecipients: fullMessage.ccRecipients,
              receivedDateTime: fullMessage.receivedDateTime,
            });
          });

          // Upload attachments if any
          if (fullMessage.attachments) {
            for (const attachment of fullMessage.attachments) {
              bytesTransferred += attachment.size || 0;
            }
          }

          processed++;
          bytesTransferred += JSON.stringify(fullMessage).length;

        } catch (error: any) {
          this.logger.error({ messageId: message.id, error: error.message }, 'Failed to migrate message');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed, bytesTransferred };
  }

  private async migrateCalendar(
    sourceClient: any,
    destClient: any,
    userId: string,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    let nextLink: string | undefined;

    this.logger.info({ userId }, 'Migrating calendar events');

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return sourceClient.api(nextLink).get();
        }
        return sourceClient
          .api(`/users/${userId}/calendar/events`)
          .top(50)
          .get();
      });

      for (const event of response.value) {
        try {
          await this.retryWithBackoff(async () => {
            await destClient.api(`/users/${userId}/calendar/events`).post({
              subject: event.subject,
              body: event.body,
              start: event.start,
              end: event.end,
              location: event.location,
              attendees: event.attendees,
              recurrence: event.recurrence,
            });
          });
          processed++;
        } catch (error: any) {
          this.logger.error({ eventId: event.id, error: error.message }, 'Failed to migrate event');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    this.logger.info({ userId, processed, failed }, 'Calendar migration completed');
    return { processed, failed };
  }

  private async migrateContacts(
    sourceClient: any,
    destClient: any,
    userId: string,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    let nextLink: string | undefined;

    this.logger.info({ userId }, 'Migrating contacts');

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return sourceClient.api(nextLink).get();
        }
        return sourceClient
          .api(`/users/${userId}/contacts`)
          .top(50)
          .get();
      });

      for (const contact of response.value) {
        try {
          await this.retryWithBackoff(async () => {
            await destClient.api(`/users/${userId}/contacts`).post({
              displayName: contact.displayName,
              givenName: contact.givenName,
              surname: contact.surname,
              emailAddresses: contact.emailAddresses,
              businessPhones: contact.businessPhones,
              mobilePhone: contact.mobilePhone,
              jobTitle: contact.jobTitle,
              companyName: contact.companyName,
            });
          });
          processed++;
        } catch (error: any) {
          this.logger.error({ contactId: contact.id, error: error.message }, 'Failed to migrate contact');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    this.logger.info({ userId, processed, failed }, 'Contacts migration completed');
    return { processed, failed };
  }
}
