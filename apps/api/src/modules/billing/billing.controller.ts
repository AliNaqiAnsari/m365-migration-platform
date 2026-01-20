import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Stripe from 'stripe';

import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('billing')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing information' })
  async getBillingInfo(@CurrentUser() user: CurrentUserPayload) {
    return this.billingService.getBillingInfo(user.organizationId);
  }

  @Post('calculate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate migration cost' })
  async calculateCost(
    @Body() body: { workloads: string[]; userCount: number; siteCount?: number },
  ) {
    return this.billingService.calculateMigrationCost(body);
  }

  @Post('checkout/migration')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create checkout session for migration' })
  async createMigrationCheckout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      jobId: string;
      workloads: string[];
      userCount: number;
      siteCount?: number;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    const estimate = this.billingService.calculateMigrationCost({
      workloads: body.workloads,
      userCount: body.userCount,
      siteCount: body.siteCount,
    });

    return this.billingService.createMigrationCheckout(
      user.organizationId,
      body.jobId,
      estimate,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');

    if (!webhookSecret) {
      return { received: true };
    }

    const stripe = new Stripe(this.configService.get('stripe.secretKey')!, {
      apiVersion: '2024-12-18.acacia',
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return { error: 'Webhook signature verification failed' };
    }

    await this.billingService.handleWebhook(event);

    return { received: true };
  }
}
