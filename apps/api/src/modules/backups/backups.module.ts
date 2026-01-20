import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BackupsService } from './backups.service';
import { BackupsController } from './backups.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'backup-queue' }, { name: 'restore-queue' }),
  ],
  controllers: [BackupsController],
  providers: [BackupsService],
  exports: [BackupsService],
})
export class BackupsModule {}
