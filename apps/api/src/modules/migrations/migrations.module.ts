import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MigrationsService } from './migrations.service';
import { MigrationsController } from './migrations.controller';
import { MigrationsGateway } from './migrations.gateway';
import { TenantsModule } from '../tenants/tenants.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [
    TenantsModule,
    GraphModule,
    BullModule.registerQueue(
      { name: 'migration-queue' },
      { name: 'exchange-migration' },
      { name: 'sharepoint-migration' },
      { name: 'onedrive-migration' },
      { name: 'teams-migration' },
    ),
  ],
  controllers: [MigrationsController],
  providers: [MigrationsService, MigrationsGateway],
  exports: [MigrationsService],
})
export class MigrationsModule {}
