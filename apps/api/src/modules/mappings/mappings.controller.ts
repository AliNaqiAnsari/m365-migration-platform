import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MappingsService } from './mappings.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';

class UpdateMappingDto {
  @IsOptional()
  @IsString()
  destinationId?: string;

  @IsOptional()
  @IsString()
  destIdentifier?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

@Controller('migrations/:jobId/mappings')
@UseGuards(AuthGuard, RolesGuard)
export class MappingsController {
  constructor(private mappingsService: MappingsService) {}

  @Get()
  list(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('objectType') objectType?: string,
    @Query('status') status?: string,
  ) {
    return this.mappingsService.listMappings(jobId, user.organizationId, { objectType, status });
  }

  @Get('summary')
  summary(@Param('jobId') jobId: string, @CurrentUser() user: CurrentUserData) {
    return this.mappingsService.getMappingSummary(jobId, user.organizationId);
  }

  @Get('validate')
  validate(@Param('jobId') jobId: string, @CurrentUser() user: CurrentUserData) {
    return this.mappingsService.validateMappings(jobId, user.organizationId);
  }

  @Put(':mappingId')
  @Roles('MEMBER')
  update(
    @Param('jobId') jobId: string,
    @Param('mappingId') mappingId: string,
    @Body() dto: UpdateMappingDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.mappingsService.updateMapping(jobId, mappingId, user.organizationId, dto);
  }
}
