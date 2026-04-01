import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { UsageInterceptor } from './common/interceptors/usage.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { MigrationsModule } from './modules/migrations/migrations.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { MappingsModule } from './modules/mappings/mappings.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { BillingModule } from './modules/billing/billing.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './config/database.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = config.get<number>('redis.port');
        const useTls = config.get('redis.tls') === 'true' || port === 6380;
        return {
          connection: {
            host: config.get('redis.host'),
            port,
            password: config.get('redis.password') || undefined,
            tls: useTls ? { rejectUnauthorized: false } : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    MigrationsModule,
    DiscoveryModule,
    MappingsModule,
    DashboardModule,
    ActivityLogsModule,
    BillingModule,
    UsersModule,
    OrganizationsModule,
    WebhooksModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UsageInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
