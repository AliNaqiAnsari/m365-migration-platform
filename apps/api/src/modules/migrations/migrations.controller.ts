import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MigrationsService } from './migrations.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanGuard, PlanCheck } from '../../common/guards/plan.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';
import { IsString, IsArray, IsOptional, IsObject } from 'class-validator';

class CreateMigrationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  sourceTenantId: string;

  @IsString()
  destTenantId: string;

  @IsOptional()
  @IsString()
  jobType?: string;

  @IsArray()
  @IsString({ each: true })
  workloads: string[];

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

@Controller('migrations')
@UseGuards(AuthGuard, RolesGuard)
export class MigrationsController {
  constructor(private migrationsService: MigrationsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserData,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.migrationsService.list(user.organizationId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.getById(id, user.organizationId);
  }

  @Post()
  @Roles('MEMBER')
  @UseGuards(PlanGuard)
  @PlanCheck({ type: 'workload_access' })
  create(@Body() dto: CreateMigrationDto, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.create(user.organizationId, dto);
  }

  @Post(':id/start')
  @Roles('MEMBER')
  @UseGuards(PlanGuard)
  @PlanCheck({ type: 'concurrent_jobs' })
  start(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.start(id, user.organizationId);
  }

  @Post(':id/pause')
  @Roles('MEMBER')
  pause(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.pause(id, user.organizationId);
  }

  @Post(':id/resume')
  @Roles('MEMBER')
  resume(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.resume(id, user.organizationId);
  }

  @Post(':id/cancel')
  @Roles('ADMIN')
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.cancel(id, user.organizationId);
  }

  @Get(':id/tasks')
  getTasks(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.getTasks(id, user.organizationId);
  }

  @Get(':id/errors')
  getErrors(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.migrationsService.getErrors(
      id,
      user.organizationId,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Get(':id/report')
  getReport(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.getReport(id, user.organizationId);
  }

  @Get(':id/dead-letter')
  getDeadLetterItems(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.migrationsService.getDeadLetterItems(id, user.organizationId);
  }
}
