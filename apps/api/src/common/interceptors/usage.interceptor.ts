import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { PrismaClient } from '@m365-migration/database';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.organizationId) return next.handle();

    return next.handle().pipe(
      tap({
        next: () => {
          // Increment API call count (fire-and-forget)
          this.incrementApiCalls(user.organizationId).catch(() => {});
        },
      }),
    );
  }

  private async incrementApiCalls(organizationId: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await this.prisma.usageRecord.upsert({
      where: {
        organizationId_periodStart: { organizationId, periodStart },
      },
      create: {
        organizationId,
        periodStart,
        periodEnd,
        apiCalls: 1,
      },
      update: {
        apiCalls: { increment: 1 },
      },
    });
  }
}
