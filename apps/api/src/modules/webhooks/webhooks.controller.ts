import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';
import { IsString, IsArray, IsOptional, IsBoolean, IsUrl } from 'class-validator';

class CreateWebhookDto {
  @IsUrl()
  url: string;

  @IsArray()
  @IsString({ each: true })
  events: string[];
}

class UpdateWebhookDto {
  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('webhooks')
@UseGuards(AuthGuard, RolesGuard)
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Get()
  list(@CurrentUser() user: CurrentUserData) {
    return this.webhooksService.list(user.organizationId);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateWebhookDto, @CurrentUser() user: CurrentUserData) {
    return this.webhooksService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.webhooksService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  delete(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.webhooksService.delete(id, user.organizationId);
  }
}
