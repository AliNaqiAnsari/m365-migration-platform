import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@m365-migration/database';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  constructor(
    @Inject('PRISMA') private prisma: PrismaClient,
    private config: ConfigService,
  ) {}

  async list(organizationId: string) {
    return this.prisma.tenant.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        tenantId: true,
        domain: true,
        provider: true,
        connectionType: true,
        status: true,
        userCount: true,
        storageUsedBytes: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, organizationId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.sanitizeTenant(tenant);
  }

  async connect(organizationId: string, data: {
    name: string;
    connectionType: 'SOURCE' | 'DESTINATION';
    provider: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE';
    clientId: string;
    clientSecret: string;
    tenantId: string;
  }) {
    // Encrypt client secret before storing
    const encryptedSecret = this.encrypt(data.clientSecret);

    // Validate credentials by attempting to get a token
    const { ConfidentialClientApplication } = await import('@azure/msal-node');
    const msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        authority: `https://login.microsoftonline.com/${data.tenantId}`,
      },
    });

    try {
      const tokenResult = await msalClient.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });
      if (!tokenResult?.accessToken) {
        throw new Error('No token received');
      }

      // Fetch tenant domain info
      const orgResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
        headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
      });

      let domain = data.tenantId;
      if (orgResponse.ok) {
        const orgData = await orgResponse.json() as any;
        if (orgData.value?.[0]?.verifiedDomains) {
          const primary = orgData.value[0].verifiedDomains.find((d: any) => d.isDefault);
          domain = primary?.name ?? domain;
        }
      }

      return this.prisma.tenant.create({
        data: {
          organizationId,
          name: data.name,
          tenantId: data.tenantId,
          domain,
          provider: data.provider,
          connectionType: data.connectionType,
          status: 'CONNECTED',
          clientId: data.clientId,
          clientSecret: encryptedSecret,
        },
        select: {
          id: true,
          name: true,
          tenantId: true,
          domain: true,
          provider: true,
          connectionType: true,
          status: true,
          createdAt: true,
        },
      });
    } catch (error: any) {
      throw new BadRequestException(
        `Failed to connect to tenant: ${error.message}. Ensure the app registration has the correct permissions and admin consent.`,
      );
    }
  }

  async disconnect(id: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, organizationId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
        accessToken: null,
        refreshToken: null,
        clientSecret: null,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, organizationId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.delete({ where: { id } });
  }

  // Get decrypted credentials for a tenant (used internally by workers)
  async getCredentials(tenantId: string): Promise<{ clientId: string; clientSecret: string; tenantId: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || !tenant.clientId || !tenant.clientSecret) {
      throw new NotFoundException('Tenant credentials not found');
    }
    return {
      clientId: tenant.clientId,
      clientSecret: this.decrypt(tenant.clientSecret),
      tenantId: tenant.tenantId,
    };
  }

  private encrypt(text: string): string {
    const key = this.config.get<string>('encryption.key')!;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(encrypted: string): string {
    const key = this.config.get<string>('encryption.key')!;
    const [ivHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private sanitizeTenant(tenant: any) {
    const { accessToken, refreshToken, clientSecret, ...safe } = tenant;
    return safe;
  }
}
