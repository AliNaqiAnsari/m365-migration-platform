import 'dotenv/config';
import { Redis } from 'ioredis';
import { Worker } from 'bullmq';
import pino from 'pino';
import { ExchangeProcessor } from './processors/exchange.processor';
import { SharePointProcessor } from './processors/sharepoint.processor';
import { OneDriveProcessor } from './processors/onedrive.processor';
import { TeamsProcessor } from './processors/teams.processor';
import { BackupProcessor } from './processors/backup.processor';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

// Initialize processors
const exchangeProcessor = new ExchangeProcessor();
const sharePointProcessor = new SharePointProcessor();
const oneDriveProcessor = new OneDriveProcessor();
const teamsProcessor = new TeamsProcessor();
const backupProcessor = new BackupProcessor();

// Queue configurations
const queues = [
  {
    name: 'exchange-migration',
    processor: exchangeProcessor,
    concurrency: 10,
  },
  {
    name: 'sharepoint-migration',
    processor: sharePointProcessor,
    concurrency: 8,
  },
  {
    name: 'onedrive-migration',
    processor: oneDriveProcessor,
    concurrency: 12,
  },
  {
    name: 'teams-migration',
    processor: teamsProcessor,
    concurrency: 6,
  },
  {
    name: 'backup',
    processor: backupProcessor,
    concurrency: 4,
  },
];

// Create workers
const workers: Worker[] = [];

async function startWorkers() {
  logger.info('Starting M365 Migration Workers...');

  for (const queue of queues) {
    const worker = new Worker(
      queue.name,
      async (job) => {
        logger.info({ jobId: job.id, queue: queue.name }, 'Processing job');

        try {
          const result = await queue.processor.process(job);
          logger.info({ jobId: job.id, queue: queue.name }, 'Job completed');
          return result;
        } catch (error) {
          logger.error({ jobId: job.id, queue: queue.name, error }, 'Job failed');
          throw error;
        }
      },
      {
        connection: redisConnection,
        concurrency: queue.concurrency,
        limiter: {
          max: 100,
          duration: 1000,
        },
      },
    );

    worker.on('completed', (job) => {
      logger.info({ jobId: job.id, queue: queue.name }, 'Job completed successfully');
    });

    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, queue: queue.name, error: err.message }, 'Job failed');
    });

    worker.on('progress', (job, progress) => {
      logger.debug({ jobId: job.id, queue: queue.name, progress }, 'Job progress');
    });

    worker.on('error', (err) => {
      logger.error({ queue: queue.name, error: err.message }, 'Worker error');
    });

    workers.push(worker);
    logger.info({ queue: queue.name, concurrency: queue.concurrency }, 'Worker started');
  }

  logger.info(`All ${workers.length} workers started successfully`);
}

async function shutdown() {
  logger.info('Shutting down workers...');

  await Promise.all(workers.map((worker) => worker.close()));
  await redisConnection.quit();

  logger.info('Workers shut down gracefully');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start workers
startWorkers().catch((err) => {
  logger.error({ error: err.message }, 'Failed to start workers');
  process.exit(1);
});
