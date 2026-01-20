import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';

// Per-user pricing
const MIGRATION_PRICING = {
  exchange: 5.0,
  onedrive: 3.0,
  sharepoint: 2.0, // per site
  teams: 4.0,
  planner: 1.0,
  groups: 0.5,
};

// Volume discounts
function getVolumeDiscount(userCount: number): number {
  if (userCount >= 1000) return 0.2; // 20%
  if (userCount >= 500) return 0.15; // 15%
  if (userCount >= 100) return 0.1; // 10%
  return 0;
}

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
    }
  }

  /**
   * Calculate migration cost estimate
   */
  calculateMigrationCost(config: {
    workloads: string[];
    userCount: number;
    siteCount?: number;
  }) {
    const { workloads, userCount, siteCount = 0 } = config;

    const breakdown: { workload: string; count: number; unitPrice: number; total: number }[] = [];
    let subtotal = 0;

    for (const workload of workloads) {
      const unitPrice = MIGRATION_PRICING[workload as keyof typeof MIGRATION_PRICING] || 0;
      const count = workload === 'sharepoint' ? siteCount : userCount;
      const total = count * unitPrice;

      breakdown.push({ workload, count, unitPrice, total });
      subtotal += total;
    }

    const discountPercent = getVolumeDiscount(userCount) * 100;
    const discount = subtotal * (discountPercent / 100);

    return {
      breakdown,
      subtotal,
      discountPercent,
      discount,
      total: subtotal - discount,
      currency: 'USD',
    };
  }

  /**
   * Create checkout session for migration payment
   */
  async createMigrationCheckout(
    organizationId: string,
    jobId: string,
    estimate: ReturnType<typeof this.calculateMigrationCost>,
    successUrl: string,
    cancelUrl: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new BadRequestException('Organization not found');
    }

    const lineItems = estimate.breakdown.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${item.workload.charAt(0).toUpperCase() + item.workload.slice(1)} Migration`,
          description: `${item.count} ${item.workload === 'sharepoint' ? 'sites' : 'users'}`,
        },
        unit_amount: Math.round(item.unitPrice * 100), // Stripe uses cents
      },
      quantity: item.count,
    }));

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: org.billingEmail || undefined,
      line_items: lineItems,
      metadata: {
        organizationId,
        jobId,
        type: 'migration',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Get billing info for organization
   */
  async getBillingInfo(organizationId: string) {
    const [org, subscription, invoices] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, billingEmail: true, stripeCustomerId: true },
      }),
      this.prisma.subscription.findFirst({
        where: { organizationId, status: 'ACTIVE' },
        include: { plan: true },
      }),
      this.prisma.invoice.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      organization: org,
      subscription,
      invoices,
    };
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const { organizationId, jobId, type } = session.metadata || {};

    if (type === 'migration' && jobId) {
      await this.prisma.migrationJob.update({
        where: { id: jobId },
        data: {
          paymentStatus: 'PAID',
          stripePaymentId: session.payment_intent as string,
          status: 'READY',
        },
      });
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    // Handle subscription invoice payments
    console.log('Invoice paid:', invoice.id);
  }
}
