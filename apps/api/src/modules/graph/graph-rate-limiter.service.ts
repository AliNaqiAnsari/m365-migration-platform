import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  general: { requestsPerWindow: 10000, windowMs: 600000 }, // 10 min
  outlook: { requestsPerWindow: 10000, windowMs: 600000 },
  sharepoint: { requestsPerWindow: 12000, windowMs: 600000 },
  teams: { requestsPerWindow: 30, windowMs: 1000 }, // Per second
  'teams-messages': { requestsPerWindow: 1, windowMs: 1000 },
};

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

@Injectable()
export class GraphRateLimiterService {
  private readonly logger = new Logger(GraphRateLimiterService.name);
  private readonly buckets = new Map<string, TokenBucket>();

  /**
   * Acquire a rate limit token
   */
  async acquire(tenantId: string, service = 'general'): Promise<void> {
    const config = RATE_LIMITS[service] || RATE_LIMITS.general;
    const key = `${tenantId}:${service}`;

    let bucket = this.buckets.get(key);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: config.requestsPerWindow,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refillRate = config.requestsPerWindow / config.windowMs;
    const refillTokens = Math.floor(elapsed * refillRate);

    if (refillTokens > 0) {
      bucket.tokens = Math.min(
        config.requestsPerWindow,
        bucket.tokens + refillTokens,
      );
      bucket.lastRefill = now;
    }

    // Check if tokens are available
    if (bucket.tokens <= 0) {
      const waitTime = Math.ceil((1 - bucket.tokens) / refillRate);
      this.logger.debug(`Rate limit wait for ${key}: ${waitTime}ms`);
      await this.sleep(waitTime);
      return this.acquire(tenantId, service);
    }

    // Consume token
    bucket.tokens--;
  }

  /**
   * Get remaining tokens for tenant/service
   */
  getRemaining(tenantId: string, service = 'general'): number {
    const key = `${tenantId}:${service}`;
    const bucket = this.buckets.get(key);
    return bucket?.tokens ?? RATE_LIMITS[service]?.requestsPerWindow ?? 10000;
  }

  /**
   * Reset rate limiter for tenant
   */
  reset(tenantId: string): void {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.buckets.delete(key);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
