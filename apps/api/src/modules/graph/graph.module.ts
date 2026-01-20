import { Module } from '@nestjs/common';
import { GraphClientService } from './graph-client.service';
import { GraphRateLimiterService } from './graph-rate-limiter.service';

@Module({
  providers: [GraphClientService, GraphRateLimiterService],
  exports: [GraphClientService, GraphRateLimiterService],
})
export class GraphModule {}
