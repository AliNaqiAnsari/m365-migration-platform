import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('migrations/:jobId/discovery')
@UseGuards(AuthGuard, RolesGuard)
export class DiscoveryController {
  constructor(private discoveryService: DiscoveryService) {}

  @Post()
  @Roles('MEMBER')
  triggerDiscovery(@Param('jobId') jobId: string, @CurrentUser() user: CurrentUserData) {
    return this.discoveryService.triggerDiscovery(jobId, user.organizationId);
  }

  @Get()
  getResults(@Param('jobId') jobId: string, @CurrentUser() user: CurrentUserData) {
    return this.discoveryService.getDiscoveryResults(jobId, user.organizationId);
  }
}
