import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { MigrationTaskPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';
import { GraphApiError } from '@m365-migration/graph-client';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks for upload
const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024; // 4MB threshold

export class OneDriveProcessor extends BaseProcessor<MigrationTaskPayload> {
  readonly queueName = 'onedrive';
  readonly concurrency = 12;

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
      await this.migrateDrive(jobId, taskId, sourceGraph, destGraph, sourceObjectId, destObjectId);
      await this.updateTaskProgress(taskId, { status: 'COMPLETED', progressPercent: 100 });
    } catch (error) {
      this.logger.error({ taskId, error }, 'OneDrive migration failed');
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      throw error;
    }

    await this.updateJobProgress(jobId);
  }

  private async migrateDrive(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceUserId: string, destUserId: string,
  ): Promise<void> {
    this.logger.info({ taskId }, 'Migrating OneDrive');

    // Get total item count
    const sourceDrive = await source.request<any>(`/users/${sourceUserId}/drive?$select=quota`);
    const totalBytes = sourceDrive.quota?.used ?? 0;
    await this.updateTaskProgress(taskId, { totalBytes: BigInt(totalBytes) });

    // Recursively process from root
    await this.processFolder(jobId, taskId, source, dest, sourceUserId, destUserId, 'root', '');
  }

  private async processFolder(
    jobId: string, taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceUserId: string, destUserId: string,
    folderId: string, destPath: string,
  ): Promise<void> {
    const path = folderId === 'root'
      ? `/users/${sourceUserId}/drive/root/children`
      : `/users/${sourceUserId}/drive/items/${folderId}/children`;

    let processedItems = 0;
    let processedBytes = BigInt(0);

    for await (const items of source.paginate<any>(`${path}?$select=id,name,size,file,folder,parentReference&$top=200`)) {
      for (const item of items) {
        try {
          if (item.folder) {
            // Create folder in destination
            const destFolderPath = destPath ? `${destPath}/${item.name}` : item.name;
            try {
              await dest.request(`/users/${destUserId}/drive/root:/${destFolderPath}`, {
                method: 'PATCH',
                body: { folder: {}, name: item.name, '@microsoft.graph.conflictBehavior': 'replace' },
              });
            } catch {
              // Folder may already exist
              await dest.request(`/users/${destUserId}/drive/root/children`, {
                method: 'POST',
                body: { name: item.name, folder: {}, '@microsoft.graph.conflictBehavior': 'replace' },
              });
            }

            // Recurse into subfolder
            await this.processFolder(jobId, taskId, source, dest, sourceUserId, destUserId, item.id, destFolderPath);
          } else if (item.file) {
            // Transfer file
            await this.transferFile(taskId, source, dest, sourceUserId, destUserId, item, destPath);
            processedBytes += BigInt(item.size ?? 0);
          }

          processedItems++;
        } catch (error) {
          if (error instanceof GraphApiError) {
            await this.logError(taskId, {
              itemId: item.id,
              itemName: item.name,
              itemType: item.folder ? 'folder' : 'file',
              errorCode: `HTTP_${error.statusCode}`,
              errorMessage: error.message,
              httpStatus: error.statusCode,
              retryable: error.isTransient || error.isThrottled,
            });
          } else {
            throw error;
          }
        }
      }

      // Checkpoint after each page
      await this.updateTaskProgress(taskId, {
        processedItems,
        processedBytes,
        checkpointData: { lastFolderId: folderId, processedItems, processedBytes: processedBytes.toString() },
      });
    }
  }

  private async transferFile(
    taskId: string,
    source: GraphClient, dest: GraphClient,
    sourceUserId: string, destUserId: string,
    item: any, destPath: string,
  ): Promise<void> {
    const fileSize = item.size ?? 0;
    const destFilePath = destPath ? `${destPath}/${item.name}` : item.name;

    // Get download URL
    const sourceItem = await source.request<any>(
      `/users/${sourceUserId}/drive/items/${item.id}?$select=id,@microsoft.graph.downloadUrl`,
    );
    const downloadUrl = sourceItem['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) {
      this.logger.warn({ itemId: item.id, name: item.name }, 'No download URL available');
      return;
    }

    if (fileSize <= SIMPLE_UPLOAD_MAX) {
      // Simple upload for small files
      const response = await fetch(downloadUrl);
      const buffer = await response.arrayBuffer();

      await dest.request(
        `/users/${destUserId}/drive/root:/${encodeURIComponent(destFilePath)}:/content`,
        {
          method: 'PUT',
          body: buffer,
          headers: { 'Content-Type': 'application/octet-stream' },
        },
      );
    } else {
      // Chunked upload for large files
      const uploadSession = await dest.createUploadSession(
        `/users/${destUserId}/drive/root:/${encodeURIComponent(destFilePath)}:`,
        item.name,
      );

      // Stream download and upload in chunks
      const response = await fetch(downloadUrl);
      if (!response.body) throw new Error('No response body for download');

      const reader = response.body.getReader();
      let offset = 0;
      let buffer = new Uint8Array(0);

      while (true) {
        const { done, value } = await reader.read();

        if (value) {
          // Append to buffer
          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;
        }

        // Upload when we have enough data or this is the last chunk
        while (buffer.length >= CHUNK_SIZE || (done && buffer.length > 0)) {
          const chunkSize = Math.min(buffer.length, CHUNK_SIZE);
          const chunk = buffer.slice(0, chunkSize);
          const rangeEnd = offset + chunkSize - 1;

          await dest.uploadChunk(
            uploadSession.uploadUrl,
            chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength),
            offset,
            rangeEnd,
            fileSize,
          );

          offset += chunkSize;
          buffer = buffer.slice(chunkSize);

          if (done && buffer.length === 0) break;
        }

        if (done) break;
      }
    }
  }
}
