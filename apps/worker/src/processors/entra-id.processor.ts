import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { MigrationTaskPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';
import { GraphApiError } from '@m365-migration/graph-client';

export class EntraIdProcessor extends BaseProcessor<MigrationTaskPayload> {
  readonly queueName = 'entra-id';
  readonly concurrency = 5;

  async process(job: Job<MigrationTaskPayload>): Promise<void> {
    const { taskId, jobId, sourceTenantId, destTenantId, taskType } = job.data;

    await this.updateTaskProgress(taskId, { status: 'IN_PROGRESS' });

    const sourceGraph = await this.createGraphClient(sourceTenantId);
    const destGraph = await this.createGraphClient(destTenantId);

    try {
      switch (taskType) {
        case 'user_sync':
          await this.syncUsers(jobId, taskId, sourceGraph, destGraph);
          break;
        case 'license_mapping':
          await this.mapLicenses(jobId, taskId, sourceGraph, destGraph);
          break;
        default:
          throw new Error(`Unknown Entra ID task type: ${taskType}`);
      }

      await this.updateTaskProgress(taskId, { status: 'COMPLETED', progressPercent: 100 });
    } catch (error) {
      this.logger.error({ taskId, taskType, error }, 'Entra ID task failed');
      await this.updateTaskProgress(taskId, { status: 'FAILED' });
      throw error;
    }

    await this.updateJobProgress(jobId);
  }

  /**
   * Sync users from source to destination tenant.
   * For each source user: check if dest user exists (by UPN match), create if not,
   * and record the identity mapping.
   */
  private async syncUsers(
    jobId: string,
    taskId: string,
    source: GraphClient,
    dest: GraphClient,
  ): Promise<void> {
    this.logger.info({ taskId }, 'Starting user sync');

    // Fetch all source users
    const sourceUsers: any[] = [];
    for await (const batch of source.paginate<any>(
      `/users?$select=id,displayName,userPrincipalName,mail,givenName,surname,jobTitle,department,accountEnabled,proxyAddresses,assignedLicenses&$filter=accountEnabled eq true&$top=100`,
    )) {
      sourceUsers.push(...batch);
    }

    await this.updateTaskProgress(taskId, { totalItems: sourceUsers.length });

    // Fetch all destination users for matching
    const destUsers: any[] = [];
    for await (const batch of dest.paginate<any>(
      `/users?$select=id,displayName,userPrincipalName,mail,accountEnabled&$top=100`,
    )) {
      destUsers.push(...batch);
    }

    // Build lookup maps for destination users
    const destByUpn = new Map<string, any>();
    const destByDisplayName = new Map<string, any>();
    for (const du of destUsers) {
      if (du.userPrincipalName) {
        destByUpn.set(du.userPrincipalName.toLowerCase(), du);
      }
      if (du.displayName) {
        const key = du.displayName.toLowerCase().trim();
        if (!destByDisplayName.has(key)) {
          destByDisplayName.set(key, du);
        }
      }
    }

    let processed = 0;
    let failed = 0;

    for (const srcUser of sourceUsers) {
      const upn = srcUser.userPrincipalName?.toLowerCase();
      const upnLocal = upn?.split('@')[0];
      const displayName = srcUser.displayName?.toLowerCase().trim();

      // Try matching strategies in order
      let destUser: any = null;
      let matchStrategy: 'UPN_MATCH' | 'EMAIL_MATCH' | 'DISPLAY_NAME_MATCH' | null = null;

      // 1. Exact UPN match
      if (upn && destByUpn.has(upn)) {
        destUser = destByUpn.get(upn);
        matchStrategy = 'UPN_MATCH';
      }

      // 2. UPN local part match (user@sourcedomain → user@destdomain)
      if (!destUser && upnLocal) {
        for (const [destUpn, du] of destByUpn) {
          if (destUpn.split('@')[0] === upnLocal) {
            destUser = du;
            matchStrategy = 'UPN_MATCH';
            break;
          }
        }
      }

      // 3. Display name match
      if (!destUser && displayName && destByDisplayName.has(displayName)) {
        destUser = destByDisplayName.get(displayName);
        matchStrategy = 'DISPLAY_NAME_MATCH';
      }

      // Upsert identity mapping
      try {
        await this.prisma.identityMapping.upsert({
          where: {
            jobId_objectType_sourceId: {
              jobId,
              objectType: 'USER',
              sourceId: srcUser.id,
            },
          },
          create: {
            jobId,
            objectType: 'USER',
            sourceId: srcUser.id,
            sourceIdentifier: srcUser.userPrincipalName,
            destinationId: destUser?.id ?? null,
            destIdentifier: destUser?.userPrincipalName ?? null,
            matchStrategy: matchStrategy ?? undefined,
            status: destUser ? 'AUTO_MATCHED' : 'PENDING',
          },
          update: {
            destinationId: destUser?.id ?? null,
            destIdentifier: destUser?.userPrincipalName ?? null,
            matchStrategy: matchStrategy ?? undefined,
            status: destUser ? 'AUTO_MATCHED' : 'PENDING',
          },
        });
        processed++;
      } catch (error) {
        failed++;
        await this.logError(taskId, {
          itemId: srcUser.id,
          itemName: srcUser.displayName,
          itemType: 'user',
          errorCode: 'USER_MAPPING_FAILED',
          errorMessage: String(error),
          retryable: true,
        });
      }

      // Update progress every 50 users
      if (processed % 50 === 0 || processed === sourceUsers.length) {
        await this.updateTaskProgress(taskId, {
          processedItems: processed,
          failedItems: failed,
          progressPercent: sourceUsers.length > 0 ? (processed / sourceUsers.length) * 100 : 0,
          checkpointData: { processedUsers: processed, totalUsers: sourceUsers.length },
        });
      }
    }

    this.logger.info(
      { taskId, total: sourceUsers.length, processed, failed },
      'User sync complete',
    );
  }

  /**
   * Map licenses from source to destination tenant.
   * Compares source SKUs (by part number) to destination available SKUs,
   * builds a mapping, and records which users need license assignment.
   */
  private async mapLicenses(
    jobId: string,
    taskId: string,
    source: GraphClient,
    dest: GraphClient,
  ): Promise<void> {
    this.logger.info({ taskId }, 'Starting license mapping');

    // Get source subscribed SKUs
    const sourceSKUs = await source.request<{ value: any[] }>('/subscribedSkus');
    // Get destination subscribed SKUs
    const destSKUs = await dest.request<{ value: any[] }>('/subscribedSkus');

    // Build dest SKU lookup by sku part number
    const destSkuByPartNumber = new Map<string, any>();
    for (const sku of destSKUs.value) {
      destSkuByPartNumber.set(sku.skuPartNumber, sku);
    }

    // Map source SKUs to destination SKUs
    const skuMapping = new Map<string, string>(); // sourceSkuId → destSkuId
    const unmappedSkus: string[] = [];

    for (const srcSku of sourceSKUs.value) {
      const destSku = destSkuByPartNumber.get(srcSku.skuPartNumber);
      if (destSku) {
        skuMapping.set(srcSku.skuId, destSku.skuId);
      } else {
        unmappedSkus.push(srcSku.skuPartNumber);
      }
    }

    if (unmappedSkus.length > 0) {
      this.logger.warn(
        { taskId, unmappedSkus },
        'Some source SKUs have no matching destination SKU',
      );
    }

    // Get all source users with licenses
    // Get all users with their licenses — filter client-side since $count requires ConsistencyLevel header
    const allUsers: any[] = [];
    for await (const batch of source.paginate<any>(
      `/users?$select=id,displayName,userPrincipalName,assignedLicenses&$top=100`,
    )) {
      allUsers.push(...batch);
    }
    const licensedUsers = allUsers.filter(
      (u: any) => u.assignedLicenses && u.assignedLicenses.length > 0,
    );

    await this.updateTaskProgress(taskId, { totalItems: licensedUsers.length });

    let processed = 0;
    let failed = 0;

    for (const srcUser of licensedUsers) {
      // Resolve the user mapping to find dest user
      const destUserId = await this.resolveMapping(jobId, 'USER', srcUser.id);
      if (!destUserId) {
        // No user mapping — skip license assignment
        processed++;
        continue;
      }

      // Build destination license list from source assignments
      const destLicenses: Array<{ skuId: string; disabledPlans: string[] }> = [];
      for (const srcLicense of srcUser.assignedLicenses ?? []) {
        const destSkuId = skuMapping.get(srcLicense.skuId);
        if (destSkuId) {
          destLicenses.push({
            skuId: destSkuId,
            disabledPlans: srcLicense.disabledPlans ?? [],
          });
        }
      }

      if (destLicenses.length === 0) {
        processed++;
        continue;
      }

      try {
        await dest.request(`/users/${destUserId}/assignLicense`, {
          method: 'POST',
          body: {
            addLicenses: destLicenses,
            removeLicenses: [],
          },
        });
        processed++;
      } catch (error) {
        failed++;
        const isGraphError = error instanceof GraphApiError;
        await this.logError(taskId, {
          itemId: srcUser.id,
          itemName: srcUser.displayName,
          itemType: 'license',
          errorCode: isGraphError ? `HTTP_${error.statusCode}` : 'LICENSE_ASSIGN_FAILED',
          errorMessage: String(error),
          errorCategory: isGraphError && error.isPermissionError ? 'PERMISSION_DENIED' : 'PERMANENT',
          httpStatus: isGraphError ? error.statusCode : undefined,
          retryable: isGraphError ? error.isTransient : true,
        });
      }

      if (processed % 50 === 0 || processed === licensedUsers.length) {
        await this.updateTaskProgress(taskId, {
          processedItems: processed,
          failedItems: failed,
          progressPercent: licensedUsers.length > 0 ? (processed / licensedUsers.length) * 100 : 0,
        });
      }
    }

    // Store SKU mapping as checkpoint for reference
    await this.updateTaskProgress(taskId, {
      processedItems: processed,
      failedItems: failed,
      checkpointData: {
        skuMapping: Object.fromEntries(skuMapping),
        unmappedSkus,
        totalLicensedUsers: licensedUsers.length,
      },
    });

    this.logger.info(
      { taskId, total: licensedUsers.length, processed, failed, skusMapped: skuMapping.size, skusUnmapped: unmappedSkus.length },
      'License mapping complete',
    );
  }
}
