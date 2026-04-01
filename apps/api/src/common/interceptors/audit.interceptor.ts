import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { PrismaClient, LogCategory } from '@m365-migration/database';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const path = req.route?.path ?? req.url;
    const user = req.user;

    if (!user?.organizationId) {
      return next.handle();
    }

    const category = this.resolveCategory(path);
    const action = this.resolveAction(method, path);

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          // Fire-and-forget audit log
          this.prisma.activityLog.create({
            data: {
              organizationId: user.organizationId,
              userId: user.id,
              jobId: this.extractJobId(path, req.params),
              category,
              action,
              details: {
                method,
                path,
                params: req.params,
                statusCode: context.switchToHttp().getResponse().statusCode,
              } as any,
              ipAddress: req.ip || req.headers['x-forwarded-for'],
            },
          }).catch(() => {}); // Non-critical
        },
      }),
    );
  }

  private resolveCategory(path: string): LogCategory {
    if (path.includes('auth')) return 'AUTH';
    if (path.includes('migration')) return 'MIGRATION';
    if (path.includes('tenant')) return 'TENANT';
    return 'SYSTEM';
  }

  private resolveAction(method: string, path: string): string {
    const segments = path.split('/').filter(Boolean);
    const resource = segments[0] ?? 'unknown';
    const subAction = segments.length > 1 ? segments[segments.length - 1] : '';

    switch (method) {
      case 'POST':
        if (subAction === 'start') return `${resource}.started`;
        if (subAction === 'pause') return `${resource}.paused`;
        if (subAction === 'resume') return `${resource}.resumed`;
        if (subAction === 'cancel') return `${resource}.cancelled`;
        return `${resource}.created`;
      case 'PUT':
      case 'PATCH':
        return `${resource}.updated`;
      case 'DELETE':
        return `${resource}.deleted`;
      default:
        return `${resource}.${method.toLowerCase()}`;
    }
  }

  private extractJobId(path: string, params: any): string | undefined {
    if (params?.id && path.includes('migration')) return params.id;
    if (params?.jobId) return params.jobId;
    return undefined;
  }
}
