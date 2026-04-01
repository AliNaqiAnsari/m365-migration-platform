import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { PrismaClient } from '@m365-migration/database';

@Injectable()
export class WebhooksService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  async list(organizationId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { organizationId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        failCount: true,
        lastDeliveredAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, data: { url: string; events: string[] }) {
    const secret = randomBytes(32).toString('hex');

    return this.prisma.webhookEndpoint.create({
      data: {
        organizationId,
        url: data.url,
        events: data.events,
        secret,
      },
      select: {
        id: true,
        url: true,
        events: true,
        secret: true, // Only shown once at creation
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: string,
    organizationId: string,
    data: { url?: string; events?: string[]; isActive?: boolean },
  ) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, organizationId },
    });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');

    return this.prisma.webhookEndpoint.update({
      where: { id },
      data: {
        url: data.url ?? endpoint.url,
        events: data.events ?? endpoint.events,
        isActive: data.isActive ?? endpoint.isActive,
      },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id, organizationId },
    });
    if (!endpoint) throw new NotFoundException('Webhook endpoint not found');

    await this.prisma.webhookEndpoint.delete({ where: { id } });
    return { message: 'Webhook endpoint deleted' };
  }
}
