import { Job } from 'bullmq';
import { BaseProcessor, MigrationJobData, ProcessorResult } from './base.processor';

interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
}

interface DriveItem {
  id: string;
  name: string;
  size: number;
  folder?: { childCount: number };
  file?: { mimeType: string };
  webUrl: string;
}

export class SharePointProcessor extends BaseProcessor {
  async process(job: Job<MigrationJobData>): Promise<ProcessorResult> {
    const { sourceTenantId, destinationTenantId, sourceId, taskId } = job.data;

    this.logger.info({ taskId, sourceId }, 'Starting SharePoint migration');

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

      // Get site information
      const site = await this.getSite(sourceClient, sourceId);
      this.logger.info({ site: site.displayName }, 'Processing SharePoint site');

      // Create or get destination site
      const destSite = await this.ensureDestinationSite(destClient, site);

      // Get document libraries
      const libraries = await this.getDocumentLibraries(sourceClient, sourceId);
      this.logger.info({ libraryCount: libraries.length }, 'Found document libraries');

      for (let i = 0; i < libraries.length; i++) {
        const library = libraries[i];

        try {
          // Migrate library
          const libResult = await this.migrateDocumentLibrary(
            sourceClient,
            destClient,
            sourceId,
            destSite.id,
            library,
            job,
          );

          result.itemsProcessed += libResult.processed;
          result.itemsFailed += libResult.failed;
          result.bytesTransferred += libResult.bytesTransferred;

          // Update progress
          const progress = Math.round(((i + 1) / libraries.length) * 100);
          await job.updateProgress(progress);

        } catch (error: any) {
          this.logger.error({ library: library.name, error: error.message }, 'Failed to migrate library');
          result.errors.push(`Failed to migrate library ${library.name}: ${error.message}`);
        }
      }

      // Migrate lists
      const listsResult = await this.migrateLists(sourceClient, destClient, sourceId, destSite.id, job);
      result.itemsProcessed += listsResult.processed;
      result.itemsFailed += listsResult.failed;

      result.success = result.itemsFailed === 0;

    } catch (error: any) {
      this.logger.error({ taskId, error: error.message }, 'SharePoint migration failed');
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  private async getSite(client: any, siteId: string): Promise<SharePointSite> {
    return this.retryWithBackoff(async () => {
      return client.api(`/sites/${siteId}`).get();
    });
  }

  private async ensureDestinationSite(client: any, sourceSite: SharePointSite): Promise<SharePointSite> {
    // In production, this would create or find the matching destination site
    // For now, we'll assume a site with the same name exists
    const response = await this.retryWithBackoff(async () => {
      return client
        .api('/sites')
        .filter(`displayName eq '${sourceSite.displayName}'`)
        .get();
    });

    if (response.value.length > 0) {
      return response.value[0];
    }

    // Create site if not found
    throw new Error('Destination site not found. Please create the site manually first.');
  }

  private async getDocumentLibraries(client: any, siteId: string): Promise<any[]> {
    const response = await this.retryWithBackoff(async () => {
      return client.api(`/sites/${siteId}/drives`).get();
    });
    return response.value;
  }

  private async migrateDocumentLibrary(
    sourceClient: any,
    destClient: any,
    sourceSiteId: string,
    destSiteId: string,
    library: any,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number; bytesTransferred: number }> {
    let processed = 0;
    let failed = 0;
    let bytesTransferred = 0;

    this.logger.info({ library: library.name }, 'Migrating document library');

    // Get destination library
    const destLibraries = await this.retryWithBackoff(async () => {
      return destClient.api(`/sites/${destSiteId}/drives`).get();
    });

    let destLibrary = destLibraries.value.find((l: any) => l.name === library.name);

    if (!destLibrary) {
      // Create library in destination
      destLibrary = await this.retryWithBackoff(async () => {
        return destClient.api(`/sites/${destSiteId}/lists`).post({
          displayName: library.name,
          list: {
            template: 'documentLibrary',
          },
        });
      });
    }

    // Migrate items recursively
    const itemResult = await this.migrateItems(
      sourceClient,
      destClient,
      library.id,
      destLibrary.id,
      'root',
      job,
    );

    processed += itemResult.processed;
    failed += itemResult.failed;
    bytesTransferred += itemResult.bytesTransferred;

    return { processed, failed, bytesTransferred };
  }

  private async migrateItems(
    sourceClient: any,
    destClient: any,
    sourceDriveId: string,
    destDriveId: string,
    parentPath: string,
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
          .api(`/drives/${sourceDriveId}/items/${parentPath}/children`)
          .top(50)
          .get();
      });

      for (const item of response.value as DriveItem[]) {
        try {
          if (item.folder) {
            // Create folder in destination
            await this.retryWithBackoff(async () => {
              await destClient.api(`/drives/${destDriveId}/items/${parentPath}/children`).post({
                name: item.name,
                folder: {},
              });
            });

            // Recursively migrate folder contents
            const folderResult = await this.migrateItems(
              sourceClient,
              destClient,
              sourceDriveId,
              destDriveId,
              item.id,
              job,
            );

            processed += folderResult.processed;
            failed += folderResult.failed;
            bytesTransferred += folderResult.bytesTransferred;

          } else if (item.file) {
            // Download file content
            const content = await this.retryWithBackoff(async () => {
              return sourceClient
                .api(`/drives/${sourceDriveId}/items/${item.id}/content`)
                .get();
            });

            // Upload to destination
            if (item.size < 4 * 1024 * 1024) {
              // Small file - simple upload
              await this.retryWithBackoff(async () => {
                await destClient
                  .api(`/drives/${destDriveId}/items/${parentPath}:/${item.name}:/content`)
                  .put(content);
              });
            } else {
              // Large file - resumable upload
              await this.uploadLargeFile(destClient, destDriveId, parentPath, item.name, content, item.size);
            }

            bytesTransferred += item.size;
          }

          processed++;

        } catch (error: any) {
          this.logger.error({ itemId: item.id, name: item.name, error: error.message }, 'Failed to migrate item');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed, bytesTransferred };
  }

  private async uploadLargeFile(
    client: any,
    driveId: string,
    parentPath: string,
    fileName: string,
    content: Buffer,
    fileSize: number,
  ): Promise<void> {
    // Create upload session
    const uploadSession = await this.retryWithBackoff(async () => {
      return client
        .api(`/drives/${driveId}/items/${parentPath}:/${fileName}:/createUploadSession`)
        .post({
          item: {
            '@microsoft.graph.conflictBehavior': 'replace',
          },
        });
    });

    const uploadUrl = uploadSession.uploadUrl;
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    let offset = 0;

    while (offset < fileSize) {
      const length = Math.min(chunkSize, fileSize - offset);
      const chunk = content.slice(offset, offset + length);

      await this.retryWithBackoff(async () => {
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': length.toString(),
            'Content-Range': `bytes ${offset}-${offset + length - 1}/${fileSize}`,
          },
          body: chunk,
        });
      });

      offset += length;
    }
  }

  private async migrateLists(
    sourceClient: any,
    destClient: any,
    sourceSiteId: string,
    destSiteId: string,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    this.logger.info('Migrating SharePoint lists');

    // Get source lists
    const response = await this.retryWithBackoff(async () => {
      return sourceClient.api(`/sites/${sourceSiteId}/lists`).get();
    });

    for (const list of response.value) {
      // Skip system lists and document libraries
      if (list.system || list.list?.template === 'documentLibrary') {
        continue;
      }

      try {
        // Create list in destination
        await this.retryWithBackoff(async () => {
          await destClient.api(`/sites/${destSiteId}/lists`).post({
            displayName: list.displayName,
            list: {
              template: list.list?.template || 'genericList',
            },
          });
        });

        // Migrate list items
        const itemsResult = await this.migrateListItems(
          sourceClient,
          destClient,
          sourceSiteId,
          destSiteId,
          list.id,
          job,
        );

        processed += itemsResult.processed;
        failed += itemsResult.failed;

      } catch (error: any) {
        this.logger.error({ listId: list.id, error: error.message }, 'Failed to migrate list');
        failed++;
      }
    }

    return { processed, failed };
  }

  private async migrateListItems(
    sourceClient: any,
    destClient: any,
    sourceSiteId: string,
    destSiteId: string,
    listId: string,
    job: Job<MigrationJobData>,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    let nextLink: string | undefined;

    do {
      const response = await this.retryWithBackoff(async () => {
        if (nextLink) {
          return sourceClient.api(nextLink).get();
        }
        return sourceClient
          .api(`/sites/${sourceSiteId}/lists/${listId}/items`)
          .expand('fields')
          .top(50)
          .get();
      });

      for (const item of response.value) {
        try {
          await this.retryWithBackoff(async () => {
            await destClient
              .api(`/sites/${destSiteId}/lists/${listId}/items`)
              .post({
                fields: item.fields,
              });
          });
          processed++;
        } catch (error: any) {
          this.logger.error({ itemId: item.id, error: error.message }, 'Failed to migrate list item');
          failed++;
        }
      }

      nextLink = response['@odata.nextLink'];
    } while (nextLink);

    return { processed, failed };
  }
}
