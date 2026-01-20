import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    const dbHealthy = await this.checkDatabase();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        api: 'healthy',
        database: dbHealthy ? 'healthy' : 'unhealthy',
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  root() {
    return {
      name: 'M365 Migration API',
      version: '1.0.0',
      description: 'Microsoft 365 & Google Workspace Tenant-to-Tenant Migration Platform',
      docs: '/api/docs',
      health: '/api/v1/health',
      features: {
        microsoft365Migration: true,
        googleWorkspaceMigration: false, // Coming Soon
        backup: true,
        archive: true,
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
