import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { MigrationTaskPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';
import { GraphApiError } from '@m365-migration/graph-client';

export class ExchangeProcessor extends BaseProcessor<MigrationTaskPayload> {
  readonly queueName = 'exchange';
  readonly concurrency = 10;

  async process(job: Job<MigrationTaskPayload>): Promise<void> {
    const { taskId, jobId, sourceTenantId, destTenantId, sourceObjectId, destObjectId, taskType } = job.data;

    if (!destObjectId) {
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      return;
    }

    await this.updateTaskProgress(taskId, { status: 'IN_PROGRESS' });

    const sourceGraph = await this.createGraphClient(sourceTenantId);
    const destGraph = await this.createGraphClient(destTenantId);

    try {
      // Migrate mail folders, messages, calendars, and contacts
      await this.migrateMailFolders(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId);
      await this.migrateCalendar(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId);
      await this.migrateContacts(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId);

      await this.updateTaskProgress(taskId, { status: 'COMPLETED', progressPercent: 100 });
    } catch (error) {
      this.logger.error({ taskId, error }, 'Exchange migration failed');
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      throw error;
    }

    await this.updateJobProgress(jobId);
  }

  private async migrateMailFolders(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceUserId: string, destUserId: string,
  ): Promise<void> {
    this.logger.info({ taskId }, 'Migrating mail folders');

    // Get source mail folders
    const folders: any[] = [];
    for await (const batch of source.paginate<any>(
      `/users/${sourceUserId}/mailFolders?$top=100&$select=id,displayName,parentFolderId,childFolderCount,totalItemCount`,
    )) {
      folders.push(...batch);
    }

    // Create folder mapping (source folder ID → dest folder ID)
    const folderMap = new Map<string, string>();

    // Get default destination folders to map well-known folders
    const destFolders: any[] = [];
    for await (const batch of dest.paginate<any>(
      `/users/${destUserId}/mailFolders?$top=100&$select=id,displayName`,
    )) {
      destFolders.push(...batch);
    }

    // Map well-known folders by display name
    for (const sf of folders) {
      const match = destFolders.find((df: any) => df.displayName === sf.displayName);
      if (match) {
        folderMap.set(sf.id, match.id);
      }
    }

    // Create custom folders in destination
    for (const sf of folders) {
      if (folderMap.has(sf.id)) continue;
      try {
        const created = await dest.request<any>(`/users/${destUserId}/mailFolders`, {
          method: 'POST',
          body: { displayName: sf.displayName },
        });
        folderMap.set(sf.id, created.id);
      } catch (error) {
        this.logger.warn({ folder: sf.displayName, error }, 'Failed to create mail folder');
      }
    }

    // Migrate messages for each folder
    let totalProcessed = 0;
    const totalItems = folders.reduce((sum, f) => sum + (f.totalItemCount ?? 0), 0);

    await this.updateTaskProgress(taskId, { totalItems });

    for (const folder of folders) {
      const destFolderId = folderMap.get(folder.id);
      if (!destFolderId || folder.totalItemCount === 0) continue;

      // Load checkpoint if resuming
      const task = await this.prisma.migrationTask.findUnique({ where: { id: taskId } });
      const checkpoint = task?.checkpointData as any;
      const skipToken = checkpoint?.folders?.[folder.id]?.skipToken;

      try {
        for await (const messages of source.paginate<any>(
          `/users/${sourceUserId}/mailFolders/${folder.id}/messages?$select=subject,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,importance,isRead,hasAttachments,internetMessageHeaders&$top=50`,
          { deltaToken: skipToken },
        )) {
          for (const msg of messages) {
            try {
              // Create message in destination
              await dest.request(`/users/${destUserId}/mailFolders/${destFolderId}/messages`, {
                method: 'POST',
                body: {
                  subject: msg.subject,
                  body: msg.body,
                  from: msg.from,
                  toRecipients: msg.toRecipients,
                  ccRecipients: msg.ccRecipients,
                  bccRecipients: msg.bccRecipients,
                  receivedDateTime: msg.receivedDateTime,
                  sentDateTime: msg.sentDateTime,
                  importance: msg.importance,
                  isRead: msg.isRead,
                  internetMessageHeaders: msg.internetMessageHeaders,
                },
              });
              totalProcessed++;
            } catch (error) {
              if (error instanceof GraphApiError && !error.isTransient) {
                await this.logError(taskId, {
                  itemId: msg.id,
                  itemName: msg.subject,
                  itemType: 'message',
                  errorCode: `HTTP_${error.statusCode}`,
                  errorMessage: error.message,
                  errorCategory: error.isPermissionError ? 'PERMISSION_DENIED' : 'PERMANENT',
                  httpStatus: error.statusCode,
                });
              } else {
                throw error; // Retry the whole batch
              }
            }
          }

          // Checkpoint after each page
          await this.updateTaskProgress(taskId, {
            processedItems: totalProcessed,
            progressPercent: totalItems > 0 ? (totalProcessed / totalItems) * 100 : 0,
            checkpointData: {
              folders: { [folder.id]: { skipToken: source.lastDeltaLink } },
              processedItems: totalProcessed,
            },
          });
        }
      } catch (error) {
        this.logger.error({ taskId, folderId: folder.id, error }, 'Failed migrating folder');
        await this.logError(taskId, {
          itemId: folder.id,
          itemName: folder.displayName,
          itemType: 'folder',
          errorCode: 'FOLDER_MIGRATION_FAILED',
          errorMessage: String(error),
          retryable: true,
        });
      }
    }
  }

  private async migrateCalendar(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceUserId: string, destUserId: string,
  ): Promise<void> {
    this.logger.info({ taskId }, 'Migrating calendar events');

    for await (const events of source.paginate<any>(
      `/users/${sourceUserId}/events?$select=subject,body,start,end,organizer,attendees,isAllDay,recurrence,location,showAs,importance&$top=50`,
    )) {
      for (const event of events) {
        try {
          await dest.request(`/users/${destUserId}/events`, {
            method: 'POST',
            body: {
              subject: event.subject,
              body: event.body,
              start: event.start,
              end: event.end,
              attendees: event.attendees,
              isAllDay: event.isAllDay,
              recurrence: event.recurrence,
              location: event.location,
              showAs: event.showAs,
              importance: event.importance,
            },
          });
        } catch (error) {
          await this.logError(taskId, {
            itemId: event.id,
            itemName: event.subject,
            itemType: 'event',
            errorCode: 'EVENT_MIGRATION_FAILED',
            errorMessage: String(error),
            retryable: true,
          });
        }
      }
    }
  }

  private async migrateContacts(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceUserId: string, destUserId: string,
  ): Promise<void> {
    this.logger.info({ taskId }, 'Migrating contacts');

    for await (const contacts of source.paginate<any>(
      `/users/${sourceUserId}/contacts?$select=displayName,givenName,surname,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle&$top=100`,
    )) {
      for (const contact of contacts) {
        try {
          await dest.request(`/users/${destUserId}/contacts`, {
            method: 'POST',
            body: {
              displayName: contact.displayName,
              givenName: contact.givenName,
              surname: contact.surname,
              emailAddresses: contact.emailAddresses,
              businessPhones: contact.businessPhones,
              mobilePhone: contact.mobilePhone,
              companyName: contact.companyName,
              jobTitle: contact.jobTitle,
            },
          });
        } catch (error) {
          await this.logError(taskId, {
            itemId: contact.id,
            itemName: contact.displayName,
            itemType: 'contact',
            errorCode: 'CONTACT_MIGRATION_FAILED',
            errorMessage: String(error),
            retryable: true,
          });
        }
      }
    }
  }
}
