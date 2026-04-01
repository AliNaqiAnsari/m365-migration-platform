import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsEmail } from 'class-validator';

class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;
}

@Controller('organizations')
@UseGuards(AuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: CurrentUserData) {
    return this.organizationsService.getCurrent(user.organizationId);
  }

  @Patch('current')
  @Roles('ADMIN')
  update(@Body() dto: UpdateOrganizationDto, @CurrentUser() user: CurrentUserData) {
    return this.organizationsService.update(user.organizationId, dto);
  }
}
