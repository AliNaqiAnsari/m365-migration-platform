#!/usr/bin/env node
import { Command } from 'commander';
import { ApiClient } from './api-client.js';

const program = new Command();
const api = new ApiClient();

program
  .name('m365migrate')
  .description('M365 tenant-to-tenant migration CLI')
  .version('0.1.0');

// Configure API endpoint
program
  .command('config')
  .description('Configure CLI settings')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication')
  .action(async (opts) => {
    if (opts.apiUrl) api.setBaseUrl(opts.apiUrl);
    if (opts.apiKey) api.setApiKey(opts.apiKey);
    console.log('Configuration saved.');
  });

// Tenant commands
const tenants = program.command('tenants').description('Manage tenant connections');

tenants
  .command('list')
  .description('List connected tenants')
  .action(async () => {
    const result = await api.get('/tenants');
    console.table(result.data);
  });

tenants
  .command('connect')
  .description('Connect a tenant')
  .requiredOption('--name <name>', 'Tenant display name')
  .requiredOption('--type <type>', 'Connection type (SOURCE or DESTINATION)')
  .requiredOption('--tenant-id <id>', 'Azure AD tenant ID')
  .requiredOption('--client-id <id>', 'App registration client ID')
  .requiredOption('--client-secret <secret>', 'App registration client secret')
  .action(async (opts) => {
    const result = await api.post('/tenants/connect', {
      name: opts.name,
      connectionType: opts.type,
      provider: 'MICROSOFT_365',
      tenantId: opts.tenantId,
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
    });
    console.log('Tenant connected:', result.data);
  });

// Migration commands
const migrations = program.command('migrations').description('Manage migrations');

migrations
  .command('create')
  .description('Create a new migration job')
  .requiredOption('--name <name>', 'Job name')
  .requiredOption('--source <id>', 'Source tenant ID')
  .requiredOption('--dest <id>', 'Destination tenant ID')
  .requiredOption('--workloads <workloads>', 'Comma-separated workloads (EXCHANGE,ONEDRIVE,SHAREPOINT,TEAMS,GROUPS,PLANNER)')
  .option('--description <desc>', 'Job description')
  .action(async (opts) => {
    const result = await api.post('/migrations', {
      name: opts.name,
      sourceTenantId: opts.source,
      destTenantId: opts.dest,
      workloads: opts.workloads.split(','),
      description: opts.description,
    });
    console.log('Migration created:', result.data.id);
  });

migrations
  .command('list')
  .description('List migration jobs')
  .option('--status <status>', 'Filter by status')
  .action(async (opts) => {
    const params = opts.status ? `?status=${opts.status}` : '';
    const result = await api.get(`/migrations${params}`);
    if (result.data?.items) {
      for (const job of result.data.items) {
        const progress = job.totalItems > 0
          ? `${Math.round((job.processedItems / job.totalItems) * 100)}%`
          : '0%';
        console.log(`  ${job.id.slice(0, 8)}  ${job.status.padEnd(22)}  ${progress.padStart(5)}  ${job.name}`);
      }
    }
  });

migrations
  .command('start <id>')
  .description('Start a migration')
  .action(async (id) => {
    const result = await api.post(`/migrations/${id}/start`);
    console.log(result.data.message);
  });

migrations
  .command('status <id>')
  .description('Get migration status')
  .action(async (id) => {
    const result = await api.get(`/migrations/${id}`);
    const job = result.data;
    console.log(`Job:      ${job.name}`);
    console.log(`Status:   ${job.status}`);
    console.log(`Phase:    ${job.currentPhase}`);
    console.log(`Progress: ${job.processedItems}/${job.totalItems} items`);
    console.log(`Failed:   ${job.failedItems}`);
    if (job.startedAt) console.log(`Started:  ${job.startedAt}`);
  });

migrations
  .command('pause <id>')
  .description('Pause a migration')
  .action(async (id) => {
    const result = await api.post(`/migrations/${id}/pause`);
    console.log(result.data.message);
  });

migrations
  .command('resume <id>')
  .description('Resume a paused migration')
  .action(async (id) => {
    const result = await api.post(`/migrations/${id}/resume`);
    console.log(result.data.message);
  });

migrations
  .command('cancel <id>')
  .description('Cancel a migration')
  .action(async (id) => {
    const result = await api.post(`/migrations/${id}/cancel`);
    console.log(result.data.message);
  });

// Discovery
migrations
  .command('discover <id>')
  .description('Run discovery on migration source tenant')
  .action(async (id) => {
    const result = await api.post(`/migrations/${id}/discovery`);
    console.log(result.data.message);
  });

// Mappings
migrations
  .command('mappings <id>')
  .description('Show identity mappings for a migration')
  .option('--status <status>', 'Filter by status')
  .action(async (id, opts) => {
    const params = opts.status ? `?status=${opts.status}` : '';
    const result = await api.get(`/migrations/${id}/mappings${params}`);
    for (const m of result.data) {
      const status = m.status.padEnd(16);
      const arrow = m.destinationId ? '->' : '  ';
      console.log(`  ${m.objectType.padEnd(20)} ${m.sourceIdentifier ?? m.sourceId} ${arrow} ${m.destIdentifier ?? m.destinationId ?? '???'} [${status}]`);
    }
  });

// Errors
migrations
  .command('errors <id>')
  .description('Show errors for a migration')
  .action(async (id) => {
    const result = await api.get(`/migrations/${id}/errors`);
    if (result.data?.items) {
      for (const err of result.data.items) {
        console.log(`  [${err.errorCategory}] ${err.errorCode}: ${err.errorMessage}`);
        if (err.itemName) console.log(`    Item: ${err.itemName}`);
      }
    }
  });

program.parse();
