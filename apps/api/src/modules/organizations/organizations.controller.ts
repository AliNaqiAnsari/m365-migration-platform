import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('organizations')
@Controller({ path: 'organizations', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current organization' })
  async getCurrentOrganization(@CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.findById(user.organizationId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update current organization' })
  async updateOrganization(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name?: string; billingEmail?: string; settings?: Record<string, unknown> },
  ) {
    return this.organizationsService.update(user.organizationId, body);
  }

  @Get('current/stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  async getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.organizationsService.getStats(user.organizationId);
  }
}
