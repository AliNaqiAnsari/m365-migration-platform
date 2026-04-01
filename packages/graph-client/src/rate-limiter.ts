import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'rate-limiter' });

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Graph API rate limits per service endpoint
const SERVICE_LIMITS: Record<string, RateLimitConfig> = {
  default: { maxRequests: 10000, windowMs: 600_000 }, // 10k per 10 min
  outlook: { maxRequests: 10000, windowMs: 600_000 },
  sharepoint: { maxRequests: 12000, windowMs: 600_000 },
  onedrive: { maxRequests: 10000, windowMs: 600_000 },
  teams: { maxRequests: 30, windowMs: 1_000 }, // 30/sec
  'teams-channel-msg': { maxRequests: 1, windowMs: 1_000 }, // 1 msg/sec in migration mode
  planner: { maxRequests: 60, windowMs: 60_000 }, // 60/min
  batch: { maxRequests: 20, windowMs: 1_000 },
};

// Use 80% of limit as safety margin
const SAFETY_FACTOR = 0.8;

export class RateLimiter {
  private redis: Redis;
  private backoffMultipliers = new Map<string, number>();

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Check if a request can proceed. Returns wait time in ms (0 = proceed).
   */
  async acquire(tenantId: string, service: string = 'default'): Promise<number> {
    const config = SERVICE_LIMITS[service] ?? SERVICE_LIMITS.default;
    const key = `ratelimit:${tenantId}:${service}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get backoff multiplier (increases after 429 responses)
    const backoff = this.backoffMultipliers.get(key) ?? 1;
    const effectiveLimit = Math.floor(config.maxRequests * SAFETY_FACTOR / backoff);

    // Sliding window counter using sorted set
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart); // Remove expired entries
    pipeline.zcard(key); // Count current entries
    const results = await pipeline.exec();

    const currentCount = (results?.[1]?.[1] as number) ?? 0;

    if (currentCount >= effectiveLimit) {
      // Calculate how long to wait until enough entries expire
      const oldestEntries = await this.redis.zrangebyscore(
        key,
        windowStart,
        '+inf',
        'LIMIT',
        0,
        1,
      );
      if (oldestEntries.length > 0) {
        const oldestTimestamp = parseInt(oldestEntries[0], 10);
        const waitMs = oldestTimestamp + config.windowMs - now + 100; // +100ms buffer
        return Math.max(waitMs, 100);
      }
      return config.windowMs; // Worst case: wait full window
    }

    // Record this request
    await this.redis.zadd(key, now.toString(), `${now}:${Math.random()}`);
    await this.redis.pexpire(key, config.windowMs + 1000); // TTL slightly longer than window

    return 0;
  }

  /**
   * Called when a 429 response is received. Increases backoff.
   */
  recordThrottle(tenantId: string, service: string, retryAfterMs?: number): void {
    const key = `ratelimit:${tenantId}:${service}`;
    const current = this.backoffMultipliers.get(key) ?? 1;
    const newMultiplier = Math.min(current * 2, 8); // Max 8x backoff
    this.backoffMultipliers.set(key, newMultiplier);

    logger.warn(
      { tenantId, service, retryAfterMs, backoffMultiplier: newMultiplier },
      'Rate limit hit, increasing backoff',
    );

    // Gradually recover after 5 minutes
    setTimeout(() => {
      const current = this.backoffMultipliers.get(key) ?? 1;
      if (current > 1) {
        this.backoffMultipliers.set(key, Math.max(1, current / 2));
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Classify a Graph API URL to a service category for rate limiting.
   */
  static classifyService(url: string): string {
    if (url.includes('/messages') || url.includes('/mailFolders') || url.includes('/events') || url.includes('/contacts')) {
      return 'outlook';
    }
    if (url.includes('/sites/') || url.includes('/lists/')) {
      return 'sharepoint';
    }
    if (url.includes('/drives/') || url.includes('/driveItems/') || url.includes('/root/')) {
      return 'onedrive';
    }
    if (url.includes('/teams/') && url.includes('/messages')) {
      return 'teams-channel-msg';
    }
    if (url.includes('/teams/') || url.includes('/channels/')) {
      return 'teams';
    }
    if (url.includes('/planner/')) {
      return 'planner';
    }
    if (url.includes('/$batch')) {
      return 'batch';
    }
    return 'default';
  }
}
