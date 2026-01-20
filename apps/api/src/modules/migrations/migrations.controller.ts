import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { MigrationsService } from './migrations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('migrations')
@Controller({ path: 'migrations', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MigrationsController {
  constructor(private readonly migrationsService: MigrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List migration jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async listJobs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.migrationsService.findAll(user.organizationId, { page, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get migration job details' })
  async getJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.migrationsService.findById(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new migration job' })
  async createJob(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string;
      description?: string;
      sourceTenantId: string;
      destinationTenantId: string;
      jobType: string;
      workloads: string[];
      scope: object;
      options?: object;
      scheduledAt?: string;
    },
  ) {
    return this.migrationsService.create(user.organizationId, user.id, {
      ...body,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start migration job' })
  async startJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.migrationsService.start(id, user.organizationId);
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause migration job' })
  async pauseJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.migrationsService.pause(id, user.organizationId);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume migration job' })
  async resumeJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.migrationsService.resume(id, user.organizationId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel migration job' })
  async cancelJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.migrationsService.cancel(id, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete migration job' })
  async deleteJob(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.migrationsService.delete(id, user.organizationId);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get migration tasks' })
  async getTasks(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.migrationsService.getTasks(id, user.organizationId);
  }

  @Get(':id/errors')
  @ApiOperation({ summary: 'Get migration errors' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getErrors(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.migrationsService.getErrors(id, user.organizationId, { page, limit });
  }
}
