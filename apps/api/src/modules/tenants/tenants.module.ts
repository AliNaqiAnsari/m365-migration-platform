import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { GraphModule } from '../graph/graph.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GraphModule, AuthModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
