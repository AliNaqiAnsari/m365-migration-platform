import Redis from 'ioredis';
import pino from 'pino';
import { PrismaClient } from '@m365-migration/database';
import { OrchestratorProcessor } from './processors/orchestrator.processor';
import { DiscoveryProcessor } from './processors/discovery.processor';
import { ExchangeProcessor } from './processors/exchange.processor';
import { OneDriveProcessor } from './processors/onedrive.processor';
import { SharePointProcessor } from './processors/sharepoint.processor';
import { TeamsProcessor } from './processors/teams.processor';
import { GroupsProcessor } from './processors/groups.processor';
import { PlannerProcessor } from './processors/planner.processor';
import { EntraIdProcessor } from './processors/entra-id.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { startHealthServer } from './health';

const logger = pino({ name: 'worker' });

async function main() {
  // Redis connection — Azure Cache for Redis requires TLS on port 6380
  const redisPort = parseInt(process.env.REDIS_PORT ?? '6379', 10);
  const useTls = process.env.REDIS_TLS === 'true' || redisPort === 6380;

  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: redisPort,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: useTls ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 200, 5000),
    reconnectOnError: (err) => {
      logger.warn({ err: err.message }, 'Redis reconnect on error');
      return true;
    },
  });

  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error({ err: err.message }, 'Redis error'));

  const prisma = new PrismaClient();

  // Start health server for Container Apps probes
  const healthPort = parseInt(process.env.HEALTH_PORT ?? '8080', 10);
  const healthServer = startHealthServer(redis, prisma, healthPort);

  const sharedDeps = { redis, prisma, logger };

  // Start all processors
  const processors = [
    new OrchestratorProcessor(sharedDeps),
    new DiscoveryProcessor(sharedDeps),
    new ExchangeProcessor(sharedDeps),
    new OneDriveProcessor(sharedDeps),
    new SharePointProcessor(sharedDeps),
    new TeamsProcessor(sharedDeps),
    new GroupsProcessor(sharedDeps),
    new PlannerProcessor(sharedDeps),
    new EntraIdProcessor(sharedDeps),
    new WebhookProcessor(sharedDeps),
  ];

  for (const processor of processors) {
    processor.start();
    logger.info({ queue: processor.queueName }, 'Processor started');
  }

  logger.info(`Worker started with ${processors.length} processors`);

  // Graceful shutdown — Container Apps sends SIGTERM before killing
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown initiated...');

    // Stop accepting new jobs, drain in-flight work
    const stopPromises = processors.map((p) => p.stop());
    await Promise.allSettled(stopPromises);
    logger.info('All processors stopped');

    healthServer.close();
    await prisma.$disconnect();
    await redis.quit();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
