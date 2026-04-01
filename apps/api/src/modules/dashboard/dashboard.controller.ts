import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser() user: CurrentUserData) {
    return this.dashboardService.getStats(user.organizationId);
  }

  @Get('recent-activity')
  getRecentActivity(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentActivity(
      user.organizationId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
