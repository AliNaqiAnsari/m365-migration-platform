import { Controller, Get, Inject, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { PrismaClient } from '@m365-migration/database';
import type { Response } from 'express';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  /**
   * Liveness probe — is the process alive?
   * Container Apps restarts the container if this fails.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe — can the app handle traffic?
   * Container Apps stops routing traffic if this fails.
   */
  @Get('ready')
  async ready(@Res() res: Response) {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');
    const statusCode = allOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    res.status(statusCode).json({
      status: allOk ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  }

  /**
   * Startup probe — has the app finished starting?
   * Container Apps waits for this before sending liveness/readiness probes.
   */
  @Get('startup')
  @HttpCode(HttpStatus.OK)
  startup() {
    return { status: 'started', timestamp: new Date().toISOString() };
  }

  /**
   * Full health check (for monitoring dashboards).
   */
  @Get()
  async check() {
    const checks: Record<string, string> = {};
    const timings: Record<string, number> = {};

    // Database
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }
    timings.database = Date.now() - dbStart;

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'healthy' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
      timings,
    };
  }
}
