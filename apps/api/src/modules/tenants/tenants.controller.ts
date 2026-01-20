import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('tenants')
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all connected tenants' })
  async listTenants(@CurrentUser() user: CurrentUserPayload) {
    return this.tenantsService.findAll(user.organizationId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant details' })
  async getTenant(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tenantsService.findById(id, user.organizationId);
  }

  // ==================== Microsoft 365 Connection ====================

  @Get('connect/microsoft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Microsoft 365 OAuth URL' })
  @ApiQuery({ name: 'type', enum: ['source', 'destination'] })
  async getM365AuthUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type: 'source' | 'destination',
  ) {
    const connectionType = type.toUpperCase() as 'SOURCE' | 'DESTINATION';
    return this.tenantsService.getM365AuthUrl(user.organizationId, connectionType);
  }

  @Public()
  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Microsoft 365 OAuth callback' })
  async m365Callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get('frontendUrl');

    if (error) {
      return res.redirect(`${frontendUrl}/tenants?error=${encodeURIComponent(error)}`);
    }

    try {
      const tenant = await this.tenantsService.handleM365Callback(code, state);
      return res.redirect(`${frontendUrl}/tenants?connected=${tenant.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      return res.redirect(`${frontendUrl}/tenants?error=${encodeURIComponent(message)}`);
    }
  }

  // ==================== Google Workspace Connection (Coming Soon) ====================

  @Get('connect/google')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Workspace OAuth URL (Coming Soon)' })
  async getGoogleAuthUrl() {
    return {
      error: 'Google Workspace migration is coming soon!',
      comingSoon: true,
    };
  }

  // ==================== Tenant Management ====================

  @Post(':id/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect tenant' })
  async disconnectTenant(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tenantsService.disconnect(id, user.organizationId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete tenant' })
  async deleteTenant(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.tenantsService.delete(id, user.organizationId);
  }

  @Post(':id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync tenant inventory' })
  async syncTenant(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    // TODO: Implement inventory sync via Graph API
    return { message: 'Sync started', jobId: 'sync-job-id' };
  }
}
