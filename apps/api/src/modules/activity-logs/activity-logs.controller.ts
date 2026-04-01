import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, type CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('activity-logs')
@UseGuards(AuthGuard)
export class ActivityLogsController {
  constructor(private activityLogsService: ActivityLogsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserData,
    @Query('category') category?: string,
    @Query('jobId') jobId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.activityLogsService.list(user.organizationId, {
      category,
      jobId,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }
}
