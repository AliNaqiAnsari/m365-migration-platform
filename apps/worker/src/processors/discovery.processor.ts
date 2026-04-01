import { Job, Queue } from 'bullmq';
import { BaseProcessor } from './base.processor';
import type { DiscoveryJobPayload } from '@m365-migration/types';
import type { GraphClient } from '@m365-migration/graph-client';

export class DiscoveryProcessor extends BaseProcessor<DiscoveryJobPayload> {
  readonly queueName = 'discovery';
  readonly concurrency = 3;

  async process(job: Job<DiscoveryJobPayload>): Promise<void> {
    const { jobId, sourceTenantId, workloads } = job.data;
    this.logger.info({ jobId, workloads }, 'Starting tenant discovery');

    const graph = await this.createGraphClient(sourceTenantId);

    // Clear previous discovery data for this job
    await this.prisma.tenantDiscovery.deleteMany({ where: { jobId } });

    for (const workload of workloads) {
      try {
        switch (workload) {
          case 'ENTRA_ID':
          case 'EXCHANGE':
          case 'ONEDRIVE':
            await this.discoverUsers(jobId, sourceTenantId, graph);
            break;
          case 'GROUPS':
          case 'TEAMS':
            await this.discoverGroups(jobId, sourceTenantId, graph);
            break;
          case 'SHAREPOINT':
            await this.discoverSites(jobId, sourceTenantId, graph);
            break;
          case 'PLANNER':
            await this.discoverPlans(jobId, sourceTenantId, graph);
            break;
        }
      } catch (error) {
        this.logger.error({ jobId, workload, error }, 'Discovery failed for workload');
      }
    }

    // Advance to mapping phase
    await this.prisma.migrationJob.update({
      where: { id: jobId },
      data: { status: 'MAPPING', currentPhase: 'MAPPING' },
    });

    const orchestratorQueue = new Queue('orchestrator', { connection: this.redis });
    await orchestratorQueue.add('advance-phase', {
      ...job.data,
      phase: 'MAPPING',
    });
    await orchestratorQueue.close();

    this.logger.info({ jobId }, 'Discovery complete, advancing to mapping');
  }

  private async discoverUsers(jobId: string, tenantId: string, graph: GraphClient): Promise<void> {
    this.logger.info({ jobId }, 'Discovering users');
    let count = 0;

    for await (const batch of graph.paginate<any>(
      '/users?$select=id,displayName,userPrincipalName,mail,accountEnabled,assignedLicenses,proxyAddresses&$top=100',
    )) {
      const records = batch.map((user: any) => ({
        tenantId,
        jobId,
        objectType: 'USER' as const,
        objectId: user.id,
        displayName: user.displayName ?? user.userPrincipalName,
        identifier: user.userPrincipalName,
        properties: {
          mail: user.mail,
          accountEnabled: user.accountEnabled,
          licensedCount: user.assignedLicenses?.length ?? 0,
          proxyAddresses: user.proxyAddresses,
        },
      }));

      // Upsert in batches
      for (const record of records) {
        await this.prisma.tenantDiscovery.upsert({
          where: {
            tenantId_objectType_objectId: {
              tenantId: record.tenantId,
              objectType: record.objectType,
              objectId: record.objectId,
            },
          },
          create: record,
          update: { displayName: record.displayName, identifier: record.identifier, properties: record.properties },
        });
      }

      count += batch.length;
      this.logger.info({ jobId, count }, 'Users discovered so far');
    }

    this.logger.info({ jobId, totalUsers: count }, 'User discovery complete');
  }

  private async discoverGroups(jobId: string, tenantId: string, graph: GraphClient): Promise<void> {
    this.logger.info({ jobId }, 'Discovering groups and teams');
    let count = 0;

    for await (const batch of graph.paginate<any>(
      '/groups?$select=id,displayName,description,mail,mailEnabled,securityEnabled,groupTypes,resourceProvisioningOptions&$top=100',
    )) {
      for (const group of batch) {
        let objectType: string;
        if (group.resourceProvisioningOptions?.includes('Team')) {
          objectType = 'TEAM';
        } else if (group.groupTypes?.includes('Unified')) {
          objectType = 'GROUP';
        } else if (group.securityEnabled && !group.mailEnabled) {
          objectType = 'SECURITY_GROUP';
        } else if (group.mailEnabled && !group.securityEnabled) {
          objectType = 'DISTRIBUTION_LIST';
        } else {
          objectType = 'GROUP';
        }

        await this.prisma.tenantDiscovery.upsert({
          where: {
            tenantId_objectType_objectId: { tenantId, objectType: objectType as any, objectId: group.id },
          },
          create: {
            tenantId,
            jobId,
            objectType: objectType as any,
            objectId: group.id,
            displayName: group.displayName,
            identifier: group.mail,
            properties: {
              description: group.description,
              mailEnabled: group.mailEnabled,
              securityEnabled: group.securityEnabled,
              groupTypes: group.groupTypes,
            },
          },
          update: { displayName: group.displayName },
        });
      }

      count += batch.length;
    }

    this.logger.info({ jobId, totalGroups: count }, 'Group discovery complete');
  }

  private async discoverSites(jobId: string, tenantId: string, graph: GraphClient): Promise<void> {
    this.logger.info({ jobId }, 'Discovering SharePoint sites');
    let count = 0;

    for await (const batch of graph.paginate<any>(
      '/sites?search=*&$select=id,displayName,name,webUrl,siteCollection&$top=100',
    )) {
      for (const site of batch) {
        // Get storage usage for each site
        let sizeBytes = BigInt(0);
        try {
          const drive = await graph.request<any>(`/sites/${site.id}/drive?$select=quota`);
          sizeBytes = BigInt(drive.quota?.used ?? 0);
        } catch {
          // Some sites may not have a default drive
        }

        await this.prisma.tenantDiscovery.upsert({
          where: {
            tenantId_objectType_objectId: { tenantId, objectType: 'SITE', objectId: site.id },
          },
          create: {
            tenantId,
            jobId,
            objectType: 'SITE',
            objectId: site.id,
            displayName: site.displayName ?? site.name,
            identifier: site.webUrl,
            sizeBytes,
            properties: {
              name: site.name,
              webUrl: site.webUrl,
              siteCollection: site.siteCollection,
            },
          },
          update: { displayName: site.displayName ?? site.name, sizeBytes },
        });
      }

      count += batch.length;
    }

    this.logger.info({ jobId, totalSites: count }, 'Site discovery complete');
  }

  private async discoverPlans(jobId: string, tenantId: string, graph: GraphClient): Promise<void> {
    this.logger.info({ jobId }, 'Discovering Planner plans');

    // Planner plans are associated with groups — get all groups first
    const groups = await this.prisma.tenantDiscovery.findMany({
      where: { jobId, objectType: { in: ['GROUP', 'TEAM'] } },
    });

    let count = 0;
    for (const group of groups) {
      try {
        const plans = await graph.request<{ value: Array<{ id: string; title: string }> }>(
          `/groups/${group.objectId}/planner/plans`,
        );

        for (const plan of plans.value) {
          await this.prisma.tenantDiscovery.upsert({
            where: {
              tenantId_objectType_objectId: { tenantId, objectType: 'PLAN', objectId: plan.id },
            },
            create: {
              tenantId,
              jobId,
              objectType: 'PLAN',
              objectId: plan.id,
              displayName: plan.title,
              identifier: group.displayName,
              properties: { groupId: group.objectId, groupName: group.displayName },
            },
            update: {},
          });
          count++;
        }
      } catch {
        // Group may not have plans — skip
      }
    }

    this.logger.info({ jobId, totalPlans: count }, 'Planner discovery complete');
  }
}
