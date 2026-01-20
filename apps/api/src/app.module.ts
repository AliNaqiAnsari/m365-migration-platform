import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { MigrationsModule } from './modules/migrations/migrations.module';
import { BackupsModule } from './modules/backups/backups.module';
import { BillingModule } from './modules/billing/billing.module';
import { GraphModule } from './modules/graph/graph.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';

import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // BullMQ for job queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    TenantsModule,
    MigrationsModule,
    BackupsModule,
    BillingModule,
    GraphModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
