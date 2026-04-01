import { Job } from 'bullmq';
import { createHmac } from 'crypto';
import { BaseProcessor } from './base.processor';

interface WebhookJobPayload {
  endpointId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
}

export class WebhookProcessor extends BaseProcessor<WebhookJobPayload> {
  readonly queueName = 'webhooks';
  readonly concurrency = 20;

  async process(job: Job<WebhookJobPayload>): Promise<void> {
    const { endpointId, url, secret, event, payload } = job.data;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    // HMAC-SHA256 signature
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': job.id ?? '',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        // Success — reset fail count
        await this.prisma.webhookEndpoint.update({
          where: { id: endpointId },
          data: { failCount: 0, lastDeliveredAt: new Date() },
        });
        this.logger.info({ endpointId, event, status: response.status }, 'Webhook delivered');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeout);

      // Increment fail count
      const endpoint = await this.prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: { failCount: { increment: 1 } },
      });

      // Disable after 10 consecutive failures
      if (endpoint.failCount >= 10) {
        await this.prisma.webhookEndpoint.update({
          where: { id: endpointId },
          data: { isActive: false },
        });
        this.logger.warn({ endpointId }, 'Webhook endpoint disabled after 10 failures');
      }

      this.logger.error({ endpointId, event, error: String(error) }, 'Webhook delivery failed');
      throw error; // Let BullMQ handle retries
    }
  }
}
