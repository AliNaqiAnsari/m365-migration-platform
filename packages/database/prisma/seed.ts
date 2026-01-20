import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-organization' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-organization',
      plan: 'BUSINESS',
      billingEmail: 'demo@example.com',
      settings: {
        timezone: 'UTC',
        notifications: {
          email: true,
          slack: false,
        },
      },
    },
  });

  console.log(`Created organization: ${organization.name}`);

  // Create demo admin user
  const passwordHash = await bcrypt.hash('Demo123!', 12);

  const adminUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'admin@demo.com',
      },
    },
    update: {
      passwordHash,
    },
    create: {
      organizationId: organization.id,
      email: 'admin@demo.com',
      name: 'Demo Admin',
      passwordHash,
      role: 'OWNER',
      authProvider: 'LOCAL',
      emailVerified: true,
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  // Create demo member user
  const memberUser = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: 'member@demo.com',
      },
    },
    update: {
      passwordHash,
    },
    create: {
      organizationId: organization.id,
      email: 'member@demo.com',
      name: 'Demo Member',
      passwordHash,
      role: 'MEMBER',
      authProvider: 'LOCAL',
      emailVerified: true,
    },
  });

  console.log(`Created member user: ${memberUser.email}`);

  // Create sample tenants
  const sourceTenant = await prisma.tenant.upsert({
    where: {
      organizationId_tenantId: {
        organizationId: organization.id,
        tenantId: 'source-tenant-demo-001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      platform: 'MICROSOFT365',
      tenantId: 'source-tenant-demo-001',
      tenantName: 'Contoso Corp (Source)',
      tenantDomain: 'contoso.onmicrosoft.com',
      connectionType: 'SOURCE',
      status: 'CONNECTED',
      userCount: 150,
      mailboxCount: 145,
      siteCount: 25,
      teamCount: 12,
      driveStorageUsed: BigInt(1024 * 1024 * 1024 * 50), // 50 GB
      lastSyncAt: new Date(),
    },
  });

  console.log(`Created source tenant: ${sourceTenant.tenantName}`);

  const destTenant = await prisma.tenant.upsert({
    where: {
      organizationId_tenantId: {
        organizationId: organization.id,
        tenantId: 'dest-tenant-demo-001',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      platform: 'MICROSOFT365',
      tenantId: 'dest-tenant-demo-001',
      tenantName: 'Fabrikam Inc (Destination)',
      tenantDomain: 'fabrikam.onmicrosoft.com',
      connectionType: 'DESTINATION',
      status: 'CONNECTED',
      userCount: 0,
      mailboxCount: 0,
      siteCount: 0,
      teamCount: 0,
      driveStorageUsed: BigInt(0),
      lastSyncAt: new Date(),
    },
  });

  console.log(`Created destination tenant: ${destTenant.tenantName}`);

  // Create a sample migration job
  const migrationJob = await prisma.migrationJob.upsert({
    where: { id: 'demo-migration-job-001' },
    update: {},
    create: {
      id: 'demo-migration-job-001',
      organizationId: organization.id,
      sourceTenantId: sourceTenant.id,
      destinationTenantId: destTenant.id,
      createdById: adminUser.id,
      name: 'Contoso to Fabrikam Migration',
      description: 'Full tenant migration including Exchange, OneDrive, and Teams',
      jobType: 'FULL',
      workloads: ['exchange', 'onedrive', 'teams', 'sharepoint'],
      scope: {
        allUsers: true,
        allSites: true,
        allTeams: true,
      },
      options: {
        preserveTimestamps: true,
        preservePermissions: true,
        preserveVersionHistory: true,
        skipExistingItems: false,
        conflictResolution: 'rename',
        batchSize: 100,
        concurrentTasks: 5,
        throttleRequests: true,
        notifyOnComplete: true,
        notifyOnError: true,
        dryRun: false,
        enableLogging: true,
        retryFailedItems: true,
        maxRetries: 3,
      },
      status: 'DRAFT',
      progress: 0,
      totalItems: 1500,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      skippedItems: 0,
      totalBytes: BigInt(1024 * 1024 * 1024 * 50),
      transferredBytes: BigInt(0),
    },
  });

  console.log(`Created migration job: ${migrationJob.name}`);

  // Create a sample backup job
  const backupJob = await prisma.backupJob.upsert({
    where: { id: 'demo-backup-job-001' },
    update: {},
    create: {
      id: 'demo-backup-job-001',
      organizationId: organization.id,
      tenantId: sourceTenant.id,
      createdById: adminUser.id,
      name: 'Daily Contoso Backup',
      description: 'Daily incremental backup of all Exchange and OneDrive data',
      backupType: 'INCREMENTAL',
      workloads: ['exchange', 'onedrive'],
      scope: {
        allUsers: true,
      },
      scheduleCron: '0 2 * * *', // Daily at 2 AM
      nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      retentionDays: 30,
      storageTier: 'HOT',
      status: 'SCHEDULED',
      totalSnapshots: 5,
      totalStorageUsed: BigInt(1024 * 1024 * 1024 * 10), // 10 GB
    },
  });

  console.log(`Created backup job: ${backupJob.name}`);

  console.log('\n========================================');
  console.log('Database seeded successfully!');
  console.log('========================================');
  console.log('\nDemo User Credentials:');
  console.log('----------------------------------------');
  console.log('Admin User:');
  console.log('  Email:    admin@demo.com');
  console.log('  Password: Demo123!');
  console.log('----------------------------------------');
  console.log('Member User:');
  console.log('  Email:    member@demo.com');
  console.log('  Password: Demo123!');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
