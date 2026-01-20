import { Job } from 'bullmq';
import { BaseProcessor, MigrationJobData, ProcessorResult } from './base.processor';

interface DriveItem {
  id: string;
  name: string;
  size: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl: string;
  lastModifiedDateTime: string;
}

export class OneDriveProcessor extends BaseProcessor {
  private readonly CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks

  async process(job: Job<MigrationJobData>): Promise<ProcessorResult> {
    const { sourceTenantId, destinationTenantId, sourceId, taskId } = job.data;

    this.logger.info({ taskId, sourceId }, 'Starting OneDrive migration');

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

      // Get user's OneDrive
      const sourceDrive = await this.getUserDrive(sourceClient, sourceId);
      this.logger.info({ driveId: sourceDrive.id }, 'Found source OneDrive');

      // Get destination user's OneDrive
      const destDrive = await this.getUserDrive(destClient, sourceId);
      this.logger.info({ driveId: destDrive.id }, 'Found destination OneDrive');

      // Get total item count for progress tracking
      const totalItems = await this.getTotalItemCount(sourceClient, sourceDrive.id);
      this.logger.info({ totalItems }, 'Total items to migrate');

      // Migrate items recursively starting from root
      const migrationResult = await this.migrateFolder(
        sourceClient,
        destClient,
        sourceDrive.id,
        destDrive.id,
        'root',
        'root',
        job,
        totalItems,
      );

      result.itemsProcessed = migrationResult.processed;
      result.itemsFailed = migrationResult.failed;
      result.bytesTransferred = migrationResult.bytesTransferred;
      result.success = migrationResult.failed === 0;

    } catch (error: any) {
      this.logger.error({ taskId, error: error.message }, 'OneDrive migration failed');
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  private async getUserDrive(client: any, userId: string): Promise<any> {
    return this.retryWithBackoff(async () => {
      return client.api(`/users/${userId}/drive`).get();
    });
  }

  private async getTotalItemCount(client: any, driveId: string): Promise<number> {
    const response = await this.retryWithBackoff(async () => {
      return client
        .api(`/drives/${driveId}/root`)
        .select('folder')
        .get();
    });
    return response.folder?.childCount || 0;
  }

  private async migrateFolder(
    sourceClient: any,
    destClient: any,
    sourceDriveId: string,
    destDriveId: string,
    sourceFolderId: string,
    destFolderId: string,
    job: Job<MigrationJobData>,
    totalItems: number,
    processedSoFar = 0,
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
          .api(`/drives/${sourceDriveId}/items/${sourceFolderId}/children`)
          .select('id,name,size,folder,file,lastModifiedDateTime,webUrl')
          .top(100)
          .get();
      });

      for (const item of response.value as DriveItem[]) {
        try {
          if (item.folder) {
            // Create folder in destination
            const destFolder = await this.retryWithBackoff(async () => {
              return destClient
                .api(`/drives/${destDriveId}/items/${destFolderId}/children`)
                .post({
                  name: item.name,
                  folder: {},
                  '@microsoft.graph.conflictBehavior': 'rename',
                });
            });

            // Recursively migrate folder contents
            const folderResult = await this.migrateFolder(
              sourceClient,
              destClient,
              sourceDriveId,
              destDriveId,
              item.id,
              destFolder.id,
              job,
              totalItems,
              processedSoFar + processed,
            );

            processed += folderResult.processed + 1;
            failed += folderResult.failed;
            bytesTransferred += folderResult.bytesTransferred;

          } else if (item.file) {
            // Migrate file
            const fileResult = await this.migrateFile(
              sourceClient,
              destClient,
              sourceDriveId,
              destDriveId,
              item,
              destFolderId,
            );

            if (fileResult.success) {
              processed++;
              bytesTransferred += item.size;
            } else {
              failed++;
            }
          }

          // Update progress
          const currentProgress = processedSoFar + processed;
          const progress = totalItems > 0 ? Math.round((currentProgress / totalItems) * 100) : 0;
          await job.updateProgress(progress);

        } catch (error: any) {
          this.logger.error({ itemId: item.id, name: item.name, error: error.message }, 'Failed to migrate item');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed, bytesTransferred };
  }

  private async migrateFile(
    sourceClient: any,
    destClient: any,
    sourceDriveId: string,
    destDriveId: string,
    item: DriveItem,
    destFolderId: string,
  ): Promise<{ success: boolean }> {
    try {
      if (item.size < 4 * 1024 * 1024) {
        // Small file - simple upload
        const content = await this.retryWithBackoff(async () => {
          return sourceClient
            .api(`/drives/${sourceDriveId}/items/${item.id}/content`)
            .get();
        });

        await this.retryWithBackoff(async () => {
          await destClient
            .api(`/drives/${destDriveId}/items/${destFolderId}:/${item.name}:/content`)
            .put(content);
        });

      } else {
        // Large file - resumable upload
        await this.uploadLargeFile(
          sourceClient,
          destClient,
          sourceDriveId,
          destDriveId,
          item,
          destFolderId,
        );
      }

      this.logger.debug({ fileName: item.name, size: this.formatBytes(item.size) }, 'File migrated');
      return { success: true };

    } catch (error: any) {
      this.logger.error({ fileName: item.name, error: error.message }, 'Failed to migrate file');
      return { success: false };
    }
  }

  private async uploadLargeFile(
    sourceClient: any,
    destClient: any,
    sourceDriveId: string,
    destDriveId: string,
    item: DriveItem,
    destFolderId: string,
  ): Promise<void> {
    // Create upload session
    const uploadSession = await this.retryWithBackoff(async () => {
      return destClient
        .api(`/drives/${destDriveId}/items/${destFolderId}:/${item.name}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': 'rename',
          },
        });
    });

    const uploadUrl = uploadSession.uploadUrl;
    let offset = 0;
    const fileSize = item.size;

    // Download and upload in chunks
    while (offset < fileSize) {
      const rangeEnd = Math.min(offset + this.CHUNK_SIZE - 1, fileSize - 1);

      // Download chunk from source
      const chunk = await this.retryWithBackoff(async () => {
        return sourceClient
          .api(`/drives/${sourceDriveId}/items/${item.id}/content`)
          .header('Range', `bytes=${offset}-${rangeEnd}`)
          .get();
      });

      // Upload chunk to destination
      await this.retryWithBackoff(async () => {
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': (rangeEnd - offset + 1).toString(),
            'Content-Range': `bytes ${offset}-${rangeEnd}/${fileSize}`,
          },
          body: chunk,
        });

        if (!response.ok && response.status !== 202) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
      });

      offset = rangeEnd + 1;

      this.logger.debug(
        { fileName: item.name, progress: Math.round((offset / fileSize) * 100) },
        'Large file upload progress',
      );
    }
  }
}
