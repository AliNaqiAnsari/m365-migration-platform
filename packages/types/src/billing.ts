// ============================================================================
// Billing Types (Per-User Pricing Model)
// ============================================================================

import type { UUID, Timestamps, Workload } from './common';

export type BillingType = 'migration' | 'backup' | 'archive' | 'storage';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';

// Per-user pricing configuration
export interface PricingTier {
  workload: Workload;
  pricePerUnit: number; // USD
  unitType: 'user' | 'site' | 'gb';
  description: string;
}

export const MIGRATION_PRICING: PricingTier[] = [
  { workload: 'exchange', pricePerUnit: 5.00, unitType: 'user', description: 'Mailbox, Calendar, Contacts' },
  { workload: 'onedrive', pricePerUnit: 3.00, unitType: 'user', description: 'Personal files & folders' },
  { workload: 'sharepoint', pricePerUnit: 2.00, unitType: 'site', description: 'Documents, Lists, Permissions' },
  { workload: 'teams', pricePerUnit: 4.00, unitType: 'user', description: 'Teams, Channels, Messages, Files' },
  { workload: 'planner', pricePerUnit: 1.00, unitType: 'user', description: 'Tasks, Buckets, Plans' },
  { workload: 'groups', pricePerUnit: 0.50, unitType: 'user', description: 'Group memberships' },
];

// Volume discounts
export interface VolumeDiscount {
  minUsers: number;
  maxUsers: number | null;
  discountPercent: number;
}

export const VOLUME_DISCOUNTS: VolumeDiscount[] = [
  { minUsers: 100, maxUsers: 499, discountPercent: 10 },
  { minUsers: 500, maxUsers: 999, discountPercent: 15 },
  { minUsers: 1000, maxUsers: null, discountPercent: 20 },
];

// Backup subscription plans
export interface BackupPlan {
  id: string;
  name: string;
  minUsers: number;
  maxUsers: number | null;
  pricePerMonth: number;
  features: string[];
  backupFrequency: string;
  retentionDays: number;
}

export const BACKUP_PLANS: BackupPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    minUsers: 1,
    maxUsers: 50,
    pricePerMonth: 99,
    features: ['Daily backups', '30-day retention', 'Email support'],
    backupFrequency: 'daily',
    retentionDays: 30,
  },
  {
    id: 'business',
    name: 'Business',
    minUsers: 51,
    maxUsers: 200,
    pricePerMonth: 299,
    features: ['3x daily backups', '90-day retention', 'Priority support', 'Point-in-time recovery'],
    backupFrequency: '3x daily',
    retentionDays: 90,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    minUsers: 201,
    maxUsers: 1000,
    pricePerMonth: 799,
    features: ['Continuous backups', '1-year retention', 'Dedicated support', 'Advanced compliance'],
    backupFrequency: 'continuous',
    retentionDays: 365,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    minUsers: 1001,
    maxUsers: null,
    pricePerMonth: 0, // Custom pricing
    features: ['Full compliance suite', 'Unlimited retention', 'SLA guarantee', 'Custom integrations'],
    backupFrequency: 'continuous',
    retentionDays: -1, // Unlimited
  },
];

export interface PricingPlan extends Timestamps {
  id: UUID;
  name: string;
  type: BillingType;
  pricePerUnit: number;
  unitType: 'user' | 'site' | 'gb' | 'flat';
  stripePriceId?: string;
  stripeProductId?: string;
  features: string[];
  isActive: boolean;
}

export interface Subscription extends Timestamps {
  id: UUID;
  organizationId: UUID;
  planId: UUID;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  quantity: number; // Number of users/seats
  cancelAtPeriodEnd: boolean;
}

export interface UsageRecord extends Timestamps {
  id: UUID;
  organizationId: UUID;
  jobId?: UUID;
  usageType: BillingType;
  workload?: Workload;
  userCount: number;
  siteCount: number;
  bytesProcessed: number;
  unitPrice: number;
  totalAmount: number;
  billed: boolean;
  billedAt?: Date;
  stripeUsageRecordId?: string;
}

export interface Invoice extends Timestamps {
  id: UUID;
  organizationId: UUID;
  stripeInvoiceId?: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  lineItems: InvoiceLineItem[];
  paidAt?: Date;
  dueDate: Date;
  pdfUrl?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  workload?: Workload;
}

export interface PriceBreakdown {
  workload: string;
  count: number;
  unitPrice: number;
  total: number;
}

export interface PricingEstimate {
  breakdown: PriceBreakdown[];
  subtotal: number;
  discountPercent: number;
  discount: number;
  total: number;
  currency: string;
}

export interface CreateCheckoutRequest {
  jobId: UUID;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface CreateSubscriptionRequest {
  planId: UUID;
  quantity: number;
  paymentMethodId?: string;
}

export interface SubscriptionResponse {
  subscription: Subscription;
  clientSecret?: string; // For incomplete subscriptions requiring payment
}

export interface BillingPortalRequest {
  returnUrl: string;
}

export interface BillingPortalResponse {
  portalUrl: string;
}

export interface OrganizationBillingInfo {
  organization: {
    id: UUID;
    name: string;
    billingEmail?: string;
  };
  subscription?: Subscription & { plan: PricingPlan };
  usageThisPeriod: {
    migrations: number;
    backups: number;
    storageUsed: number;
  };
  invoices: Invoice[];
  paymentMethods: PaymentMethod[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}
