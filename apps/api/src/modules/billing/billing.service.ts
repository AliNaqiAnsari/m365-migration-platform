import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { PrismaClient, OrgPlan } from '@m365-migration/database';
import { PLAN_LIMITS, type PlanTier } from '@m365-migration/types';

@Injectable()
export class BillingService {
  private stripe: Stripe | null;

  constructor(
    @Inject('PRISMA') private prisma: PrismaClient,
    private config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('stripe.secretKey');
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Billing is not configured. Set STRIPE_SECRET_KEY to enable.');
    }
    return this.stripe;
  }

  async createCheckoutSession(
    organizationId: string,
    data: { plan: string; workloadAddons?: string[]; successUrl: string; cancelUrl: string },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    // Get or create Stripe customer
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await this.requireStripe().customers.create({
        name: org.name,
        email: org.billingEmail ?? undefined,
        metadata: { organizationId },
      });
      customerId = customer.id;
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Lookup the price for the plan
    const priceId = this.config.get<string>(`stripe.prices.${data.plan.toLowerCase()}`);
    if (!priceId) throw new BadRequestException(`No price configured for plan: ${data.plan}`);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    // Add workload add-on line items
    if (data.workloadAddons?.length) {
      for (const addon of data.workloadAddons) {
        const addonPriceId = this.config.get<string>(`stripe.prices.addon_${addon.toLowerCase()}`);
        if (addonPriceId) {
          lineItems.push({ price: addonPriceId, quantity: 1 });
        }
      }
    }

    const session = await this.requireStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        organizationId,
        plan: data.plan,
        workloadAddons: JSON.stringify(data.workloadAddons ?? []),
      },
      subscription_data: {
        metadata: {
          organizationId,
          plan: data.plan,
        },
      },
    });

    return { checkoutUrl: session.url };
  }

  async createCustomerPortalSession(organizationId: string, returnUrl: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org?.stripeCustomerId) throw new BadRequestException('No billing account found');

    const session = await this.requireStripe().billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl,
    });

    return { portalUrl: session.url };
  }

  async getSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const plan = (org?.plan ?? 'FREE') as PlanTier;
    const limits = PLAN_LIMITS[plan];

    return {
      subscription: subscription ?? null,
      plan,
      limits,
    };
  }

  async getUsage(organizationId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let usage = await this.prisma.usageRecord.findUnique({
      where: {
        organizationId_periodStart: { organizationId, periodStart },
      },
    });

    if (!usage) {
      usage = await this.prisma.usageRecord.create({
        data: { organizationId, periodStart, periodEnd },
      });
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });

    const plan = (org?.plan ?? 'FREE') as PlanTier;

    return {
      periodStart: usage.periodStart.toISOString(),
      periodEnd: usage.periodEnd.toISOString(),
      dataMigratedBytes: usage.dataMigratedBytes.toString(),
      itemsMigrated: usage.itemsMigrated,
      apiCalls: usage.apiCalls,
      limits: PLAN_LIMITS[plan],
    };
  }

  async getInvoices(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org?.stripeCustomerId) return { invoices: [] };

    const invoices = await this.requireStripe().invoices.list({
      customer: org.stripeCustomerId,
      limit: 20,
    });

    return {
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount: inv.amount_due,
        currency: inv.currency,
        createdAt: new Date(inv.created * 1000).toISOString(),
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
      })),
    };
  }

  // Stripe webhook handler
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('stripe.webhookSecret');
    if (!webhookSecret) throw new Error('Stripe webhook secret not configured');

    let event: Stripe.Event;
    try {
      event = this.requireStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        // Subscription renewed successfully
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const organizationId = session.metadata?.organizationId;
    const plan = session.metadata?.plan as OrgPlan;
    const workloadAddons = JSON.parse(session.metadata?.workloadAddons ?? '[]');

    if (!organizationId || !plan) return;

    // Retrieve the subscription (use any to handle Stripe API version differences)
    const stripeSubscription = await this.requireStripe().subscriptions.retrieve(session.subscription as string) as any;
    const periodStart = stripeSubscription.current_period_start
      ? new Date(stripeSubscription.current_period_start * 1000)
      : new Date();
    const periodEnd = stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price.id,
        plan,
        status: 'ACTIVE',
        workloadAddons,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price.id,
        plan,
        status: 'ACTIVE',
        workloadAddons,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { plan },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) return;

    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      unpaid: 'UNPAID',
      trialing: 'TRIALING',
    };

    const raw = subscription as any;
    const data: any = {
      status: (statusMap[subscription.status] ?? 'ACTIVE') as any,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
    if (raw.current_period_start) data.currentPeriodStart = new Date(raw.current_period_start * 1000);
    if (raw.current_period_end) data.currentPeriodEnd = new Date(raw.current_period_end * 1000);

    await this.prisma.subscription.update({ where: { id: sub.id }, data });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED' },
    });

    // Downgrade org to FREE
    await this.prisma.organization.update({
      where: { id: sub.organizationId },
      data: { plan: 'FREE' },
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!org) return;

    await this.prisma.subscription.updateMany({
      where: { organizationId: org.id },
      data: { status: 'PAST_DUE' },
    });
  }
}
