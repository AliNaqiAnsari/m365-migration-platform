import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../auth/encryption.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * List all tenants for organization
   */
  async findAll(organizationId: string) {
    return this.prisma.tenant.findMany({
      where: { organizationId },
      select: {
        id: true,
        platform: true,
        tenantId: true,
        tenantName: true,
        tenantDomain: true,
        connectionType: true,
        status: true,
        userCount: true,
        mailboxCount: true,
        siteCount: true,
        teamCount: true,
        lastSyncAt: true,
        lastError: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get tenant by ID
   */
  async findById(id: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, organizationId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      ...tenant,
      accessTokenEncrypted: undefined,
      refreshTokenEncrypted: undefined,
    };
  }

  /**
   * Generate OAuth authorization URL for Microsoft 365
   */
  getM365AuthUrl(organizationId: string, connectionType: 'SOURCE' | 'DESTINATION') {
    const clientId = this.configService.get('azure.clientId');
    const redirectUri = this.configService.get('azure.redirectUri');

    if (!clientId) {
      throw new BadRequestException('Azure AD not configured');
    }

    // State contains organization and connection type info
    const state = Buffer.from(
      JSON.stringify({ organizationId, connectionType }),
    ).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri.replace('/auth/microsoft/callback', '/tenants/microsoft/callback'),
      response_mode: 'query',
      scope: [
        'https://graph.microsoft.com/.default',
        'offline_access',
      ].join(' '),
      state,
      prompt: 'consent', // Always show consent screen for admin permissions
    });

    return {
      authUrl: `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${params}`,
    };
  }

  /**
   * Handle OAuth callback and save tenant
   */
  async handleM365Callback(code: string, state: string) {
    // Decode state
    const { organizationId, connectionType } = JSON.parse(
      Buffer.from(state, 'base64').toString(),
    );

    const clientId = this.configService.get('azure.clientId');
    const clientSecret = this.configService.get('azure.clientSecret');
    const redirectUri = this.configService.get('azure.redirectUri').replace(
      '/auth/microsoft/callback',
      '/tenants/microsoft/callback',
    );

    // Exchange code for tokens
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/.default offline_access',
        }),
      },
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new BadRequestException(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();

    // Get tenant info from Graph API
    const orgResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!orgResponse.ok) {
      throw new BadRequestException('Failed to get tenant information');
    }

    const orgData = await orgResponse.json();
    const org = orgData.value[0];

    // Encrypt tokens
    const accessTokenEncrypted = await this.encryptionService.encrypt(
      tokens.access_token,
      organizationId,
    );
    const refreshTokenEncrypted = await this.encryptionService.encrypt(
      tokens.refresh_token,
      organizationId,
    );

    // Save or update tenant
    const tenant = await this.prisma.tenant.upsert({
      where: {
        organizationId_tenantId: {
          organizationId,
          tenantId: org.id,
        },
      },
      update: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        status: 'CONNECTED',
        lastError: null,
      },
      create: {
        organizationId,
        platform: 'MICROSOFT365',
        tenantId: org.id,
        tenantName: org.displayName,
        tenantDomain: org.verifiedDomains?.find((d: { isDefault: boolean }) => d.isDefault)?.name || '',
        connectionType,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        status: 'CONNECTED',
      },
    });

    return tenant;
  }

  /**
   * Disconnect tenant
   */
  async disconnect(id: string, organizationId: string) {
    const tenant = await this.findById(id, organizationId);

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'DISCONNECTED',
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
      },
    });

    return { message: 'Tenant disconnected' };
  }

  /**
   * Delete tenant
   */
  async delete(id: string, organizationId: string) {
    const tenant = await this.findById(id, organizationId);

    // Check if tenant is used in any migrations
    const migrations = await this.prisma.migrationJob.count({
      where: {
        OR: [{ sourceTenantId: id }, { destinationTenantId: id }],
        status: { in: ['RUNNING', 'PAUSED'] },
      },
    });

    if (migrations > 0) {
      throw new BadRequestException('Cannot delete tenant with active migrations');
    }

    await this.prisma.tenant.delete({ where: { id: tenant.id } });

    return { message: 'Tenant deleted' };
  }

  /**
   * Get decrypted access token
   */
  async getAccessToken(id: string, organizationId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, organizationId },
    });

    if (!tenant || !tenant.accessTokenEncrypted) {
      throw new NotFoundException('Tenant not found or not connected');
    }

    // Check if token is expired and refresh if needed
    if (tenant.tokenExpiresAt && tenant.tokenExpiresAt < new Date()) {
      return this.refreshAccessToken(tenant);
    }

    return this.encryptionService.decrypt(
      tenant.accessTokenEncrypted,
      organizationId,
    );
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(tenant: {
    id: string;
    organizationId: string;
    refreshTokenEncrypted: Buffer | null;
  }): Promise<string> {
    if (!tenant.refreshTokenEncrypted) {
      throw new BadRequestException('No refresh token available');
    }

    const refreshToken = await this.encryptionService.decrypt(
      tenant.refreshTokenEncrypted,
      tenant.organizationId,
    );

    const clientId = this.configService.get('azure.clientId');
    const clientSecret = this.configService.get('azure.clientSecret');

    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/.default offline_access',
        }),
      },
    );

    if (!tokenResponse.ok) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'ERROR', lastError: 'Token refresh failed' },
      });
      throw new BadRequestException('Token refresh failed');
    }

    const tokens = await tokenResponse.json();

    const accessTokenEncrypted = await this.encryptionService.encrypt(
      tokens.access_token,
      tenant.organizationId,
    );
    const refreshTokenEncrypted = await this.encryptionService.encrypt(
      tokens.refresh_token,
      tenant.organizationId,
    );

    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        status: 'CONNECTED',
        lastError: null,
      },
    });

    return tokens.access_token;
  }
}
