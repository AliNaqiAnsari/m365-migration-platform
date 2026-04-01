import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlanGuard, PlanCheck } from '../../common/guards/plan.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';
import { IsString, IsIn } from 'class-validator';

class ConnectTenantDto {
  @IsString()
  name: string;

  @IsIn(['SOURCE', 'DESTINATION'])
  connectionType: 'SOURCE' | 'DESTINATION';

  @IsIn(['MICROSOFT_365', 'GOOGLE_WORKSPACE'])
  provider: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE';

  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;

  @IsString()
  tenantId: string;
}

@Controller('tenants')
@UseGuards(AuthGuard, RolesGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData) {
    return this.tenantsService.list(user.organizationId);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.tenantsService.getById(id, user.organizationId);
  }

  @Post('connect')
  @Roles('ADMIN')
  @UseGuards(PlanGuard)
  @PlanCheck({ type: 'tenant_limit' })
  connect(@Body() dto: ConnectTenantDto, @CurrentUser() user: CurrentUserData) {
    return this.tenantsService.connect(user.organizationId, dto);
  }

  @Post(':id/disconnect')
  @Roles('ADMIN')
  disconnect(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.tenantsService.disconnect(id, user.organizationId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.tenantsService.delete(id, user.organizationId);
  }
}
