import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MigrationsController } from './migrations.controller';
import { MigrationsSseController } from './migrations.sse.controller';
import { MigrationsService } from './migrations.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'orchestrator' }),
  ],
  controllers: [MigrationsController, MigrationsSseController],
  providers: [MigrationsService],
  exports: [MigrationsService],
})
export class MigrationsModule {}
