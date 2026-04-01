import { Controller, Param, Sse, UseGuards, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import { AuthGuard } from '../../common/guards/auth.guard';
import { MigrationsService } from './migrations.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@Controller('migrations')
@UseGuards(AuthGuard)
@SkipThrottle()
export class MigrationsSseController {
  constructor(
    private migrationsService: MigrationsService,
    private config: ConfigService,
  ) {}

  @Sse(':id/stream')
  stream(
    @Param('id') id: string,
    @Req() req: any,
  ): Observable<MessageEvent> {
    const organizationId = req.user.organizationId;

    return new Observable((subscriber) => {
      let subRedis: Redis | null = null;

      const setup = async () => {
        // Validate job access
        try {
          await this.migrationsService.getById(id, organizationId);
        } catch {
          subscriber.next({ type: 'error', data: JSON.stringify({ error: 'Migration not found' }) });
          subscriber.complete();
          return;
        }

        // Create a dedicated Redis connection for subscribing
        const port = this.config.get<number>('redis.port') ?? 6379;
        const useTls = this.config.get('redis.tls') === 'true' || port === 6380;

        subRedis = new Redis({
          host: this.config.get('redis.host') ?? 'localhost',
          port,
          password: this.config.get('redis.password') || undefined,
          tls: useTls ? { rejectUnauthorized: false } : undefined,
          maxRetriesPerRequest: null,
        });

        const channel = `migration:progress:${id}`;

        subRedis.subscribe(channel, (err) => {
          if (err) {
            subscriber.next({ type: 'error', data: JSON.stringify({ error: 'Subscription failed' }) });
            subscriber.complete();
            return;
          }
        });

        subRedis.on('message', (_ch: string, message: string) => {
          try {
            const parsed = JSON.parse(message);
            subscriber.next({
              type: parsed.event ?? 'progress',
              data: JSON.stringify(parsed),
              id: Date.now().toString(),
            });
          } catch {
            subscriber.next({ type: 'progress', data: message });
          }
        });

        subRedis.on('error', () => {
          // Silently handle subscriber Redis errors
        });

        // Send initial heartbeat
        subscriber.next({ type: 'connected', data: JSON.stringify({ jobId: id, timestamp: new Date().toISOString() }) });

        // Keep-alive ping every 30s to prevent proxy timeout
        const heartbeat = setInterval(() => {
          subscriber.next({ type: 'ping', data: JSON.stringify({ timestamp: new Date().toISOString() }) });
        }, 30000);

        // Cleanup on client disconnect
        req.on('close', () => {
          clearInterval(heartbeat);
          if (subRedis) {
            subRedis.unsubscribe();
            subRedis.disconnect();
            subRedis = null;
          }
          subscriber.complete();
        });
      };

      setup().catch((err) => {
        subscriber.next({ type: 'error', data: JSON.stringify({ error: String(err) }) });
        subscriber.complete();
      });
    });
  }
}
