import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { MigrationTaskPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';
import { GraphApiError } from '@m365-migration/graph-client';

export class SharePointProcessor extends BaseProcessor<MigrationTaskPayload> {
  readonly queueName = 'sharepoint';
  readonly concurrency = 8;

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
      await this.migrateSite(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId);
      await this.updateTaskProgress(taskId, { status: 'COMPLETED', progressPercent: 100 });
    } catch (error) {
      this.logger.error({ taskId, error }, 'SharePoint migration failed');
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      throw error;
    }

    await this.updateJobProgress(jobId);
  }

  private async migrateSite(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceSiteId: string, destSiteId: string,
  ): Promise<void> {
    this.logger.info({ taskId, sourceSiteId, destSiteId }, 'Migrating SharePoint site');

    // Get all document libraries from source site
    const sourceLists = await source.request<{ value: any[] }>(
      `/sites/${sourceSiteId}/lists?$select=id,displayName,list&$filter=list/template eq 'documentLibrary'`,
    );

    for (const list of sourceLists.value) {
      this.logger.info({ taskId, listName: list.displayName }, 'Migrating document library');

      // Find or create corresponding library in destination
      let destListId: string | null = null;
      try {
        const destLists = await dest.request<{ value: any[] }>(
          `/sites/${destSiteId}/lists?$select=id,displayName&$filter=displayName eq '${list.displayName.replace(/'/g, "''")}'`,
        );
        destListId = destLists.value[0]?.id;
      } catch {
        // List may not exist
      }

      if (!destListId) {
        try {
          const created = await dest.request<any>(`/sites/${destSiteId}/lists`, {
            method: 'POST',
            body: {
              displayName: list.displayName,
              list: { template: 'documentLibrary' },
            },
          });
          destListId = created.id;
        } catch (error) {
          await this.logError(taskId, {
            itemId: list.id,
            itemName: list.displayName,
            itemType: 'document_library',
            errorCode: 'CREATE_LIBRARY_FAILED',
            errorMessage: String(error),
            retryable: true,
          });
          continue;
        }
      }

      // Get the drive ID for source and destination libraries
      const sourceDrive = await source.request<any>(`/sites/${sourceSiteId}/lists/${list.id}/drive`);
      const destDrive = await dest.request<any>(`/sites/${destSiteId}/lists/${destListId}/drive`);

      // Recursively copy files
      await this.copyDriveContents(
        taskId, source, dest,
        sourceDrive.id, destDrive.id,
        'root', '',
      );
    }

    // Migrate custom lists (non-document libraries)
    await this.migrateLists(taskId, source, dest, sourceSiteId, destSiteId);
  }

  private async copyDriveContents(
    taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceDriveId: string, destDriveId: string,
    folderId: string, destPath: string,
  ): Promise<void> {
    const path = folderId === 'root'
      ? `/drives/${sourceDriveId}/root/children`
      : `/drives/${sourceDriveId}/items/${folderId}/children`;

    for await (const items of source.paginate<any>(`${path}?$select=id,name,size,file,folder&$top=200`)) {
      for (const item of items) {
        try {
          if (item.folder) {
            // Create folder
            const folderPath = destPath ? `${destPath}/${item.name}` : item.name;
            try {
              await dest.request(`/drives/${destDriveId}/root:/${folderPath}`, {
                method: 'PATCH',
                body: { folder: {}, name: item.name },
              });
            } catch {
              await dest.request(`/drives/${destDriveId}/root/children`, {
                method: 'POST',
                body: { name: item.name, folder: {}, '@microsoft.graph.conflictBehavior': 'replace' },
              });
            }
            await this.copyDriveContents(taskId, source, dest, sourceDriveId, destDriveId, item.id, folderPath);
          } else if (item.file) {
            // Get download URL
            const sourceItem = await source.request<any>(
              `/drives/${sourceDriveId}/items/${item.id}?$select=@microsoft.graph.downloadUrl`,
            );
            const downloadUrl = sourceItem['@microsoft.graph.downloadUrl'];
            if (!downloadUrl) continue;

            const filePath = destPath ? `${destPath}/${item.name}` : item.name;
            const fileSize = item.size ?? 0;

            if (fileSize <= 4 * 1024 * 1024) {
              // Simple upload
              const response = await fetch(downloadUrl);
              const buffer = await response.arrayBuffer();
              await dest.request(
                `/drives/${destDriveId}/root:/${encodeURIComponent(filePath)}:/content`,
                { method: 'PUT', body: buffer, headers: { 'Content-Type': 'application/octet-stream' } },
              );
            } else {
              // Chunked upload
              const session = await dest.createUploadSession(
                `/drives/${destDriveId}/root:/${encodeURIComponent(filePath)}:`,
                item.name,
              );
              const response = await fetch(downloadUrl);
              if (!response.body) continue;

              const reader = response.body.getReader();
              let offset = 0;
              const chunkSize = 10 * 1024 * 1024;
              let buffer = new Uint8Array(0);

              while (true) {
                const { done, value } = await reader.read();
                if (value) {
                  const newBuf = new Uint8Array(buffer.length + value.length);
                  newBuf.set(buffer);
                  newBuf.set(value, buffer.length);
                  buffer = newBuf;
                }
                while (buffer.length >= chunkSize || (done && buffer.length > 0)) {
                  const size = Math.min(buffer.length, chunkSize);
                  const chunk = buffer.slice(0, size);
                  await dest.uploadChunk(
                    session.uploadUrl,
                    chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength),
                    offset, offset + size - 1, fileSize,
                  );
                  offset += size;
                  buffer = buffer.slice(size);
                  if (done && buffer.length === 0) break;
                }
                if (done) break;
              }
            }
          }
        } catch (error) {
          await this.logError(taskId, {
            itemId: item.id,
            itemName: item.name,
            itemType: item.folder ? 'folder' : 'file',
            errorCode: 'SP_ITEM_FAILED',
            errorMessage: String(error),
            retryable: error instanceof GraphApiError && (error.isTransient || error.isThrottled),
          });
        }
      }
    }
  }

  private async migrateLists(
    taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceSiteId: string, destSiteId: string,
  ): Promise<void> {
    // Get custom lists (exclude document libraries and system lists)
    const lists = await source.request<{ value: any[] }>(
      `/sites/${sourceSiteId}/lists?$select=id,displayName,list,description`,
    );

    for (const list of lists.value) {
      if (list.list?.template === 'documentLibrary' || list.list?.hidden) continue;

      this.logger.info({ taskId, listName: list.displayName }, 'Migrating list');

      try {
        // Create list in destination
        const created = await dest.request<any>(`/sites/${destSiteId}/lists`, {
          method: 'POST',
          body: {
            displayName: list.displayName,
            description: list.description,
            list: { template: list.list?.template ?? 'genericList' },
          },
        });

        // Copy list items
        for await (const items of source.paginate<any>(
          `/sites/${sourceSiteId}/lists/${list.id}/items?$expand=fields&$top=100`,
        )) {
          for (const item of items) {
            try {
              await dest.request(`/sites/${destSiteId}/lists/${created.id}/items`, {
                method: 'POST',
                body: { fields: item.fields },
              });
            } catch {
              // Skip items that fail (column mismatch, etc.)
            }
          }
        }
      } catch (error) {
        await this.logError(taskId, {
          itemId: list.id,
          itemName: list.displayName,
          itemType: 'list',
          errorCode: 'LIST_MIGRATION_FAILED',
          errorMessage: String(error),
          retryable: true,
        });
      }
    }
  }
}
