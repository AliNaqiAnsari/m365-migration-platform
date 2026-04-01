import { Controller, Get, Post, Body, Headers, Req, UseGuards, RawBodyRequest } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsArray } from 'class-validator';

class CreateCheckoutDto {
  @IsString()
  plan: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workloadAddons?: string[];

  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;
}

class CustomerPortalDto {
  @IsString()
  returnUrl: string;
}

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('create-checkout')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  createCheckout(@Body() dto: CreateCheckoutDto, @CurrentUser() user: CurrentUserData) {
    return this.billingService.createCheckoutSession(user.organizationId, dto);
  }

  @Post('customer-portal')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  customerPortal(@Body() dto: CustomerPortalDto, @CurrentUser() user: CurrentUserData) {
    return this.billingService.createCustomerPortalSession(user.organizationId, dto.returnUrl);
  }

  @Get('subscription')
  @UseGuards(AuthGuard)
  getSubscription(@CurrentUser() user: CurrentUserData) {
    return this.billingService.getSubscription(user.organizationId);
  }

  @Get('usage')
  @UseGuards(AuthGuard)
  getUsage(@CurrentUser() user: CurrentUserData) {
    return this.billingService.getUsage(user.organizationId);
  }

  @Get('invoices')
  @UseGuards(AuthGuard)
  getInvoices(@CurrentUser() user: CurrentUserData) {
    return this.billingService.getInvoices(user.organizationId);
  }

  @Post('webhook')
  @SkipThrottle()
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { error: 'Raw body not available' };
    }
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
