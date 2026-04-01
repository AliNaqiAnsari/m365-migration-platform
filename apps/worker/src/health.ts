import { createServer, type Server } from 'http';
import type Redis from 'ioredis';
import type { PrismaClient } from '@m365-migration/database';
import pino from 'pino';

const logger = pino({ name: 'worker-health' });

/**
 * Lightweight HTTP health server for the worker process.
 * Azure Container Apps uses this for liveness/readiness probes.
 */
export function startHealthServer(
  redis: Redis,
  prisma: PrismaClient,
  port: number = 8080,
): Server {
  const server = createServer(async (req, res) => {
    if (req.url === '/health/live') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'alive', timestamp: new Date().toISOString() }));
      return;
    }

    if (req.url === '/health/ready') {
      const checks: Record<string, string> = {};

      try {
        await redis.ping();
        checks.redis = 'ok';
      } catch {
        checks.redis = 'error';
      }

      try {
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'ok';
      } catch {
        checks.database = 'error';
      }

      const allOk = Object.values(checks).every((v) => v === 'ok');
      const statusCode = allOk ? 200 : 503;

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: allOk ? 'ready' : 'not_ready', checks }));
      return;
    }

    if (req.url === '/health' || req.url === '/health/startup') {
      const checks: Record<string, string> = {};

      try { await redis.ping(); checks.redis = 'ok'; } catch { checks.redis = 'error'; }
      try { await prisma.$queryRaw`SELECT 1`; checks.database = 'ok'; } catch { checks.database = 'error'; }

      // Report queue depths
      const queues = ['orchestrator', 'discovery', 'exchange', 'onedrive', 'sharepoint', 'teams', 'groups', 'planner'];
      const queueDepths: Record<string, number> = {};
      for (const q of queues) {
        try {
          const waiting = await redis.llen(`bull:${q}:wait`);
          const active = await redis.llen(`bull:${q}:active`);
          queueDepths[q] = waiting + active;
        } catch {
          queueDepths[q] = -1;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: Object.values(checks).every((v) => v === 'ok') ? 'healthy' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks,
        queueDepths,
      }));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, () => {
    logger.info({ port }, 'Worker health server started');
  });

  return server;
}
