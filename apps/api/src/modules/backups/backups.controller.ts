import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { BackupsService } from './backups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('backups')
@Controller({ path: 'backups', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  @ApiOperation({ summary: 'List backup jobs' })
  async listJobs(@CurrentUser() user: CurrentUserPayload) {
    return this.backupsService.findAll(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup job details' })
  async getJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.backupsService.findById(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create backup job' })
  async createJob(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string;
      description?: string;
      tenantId: string;
      backupType: string;
      workloads: string[];
      scope: object;
      scheduleCron?: string;
      retentionDays?: number;
    },
  ) {
    return this.backupsService.create(user.organizationId, user.id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete backup job' })
  async deleteJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.backupsService.delete(id, user.organizationId);
  }
}
