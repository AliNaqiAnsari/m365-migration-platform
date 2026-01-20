import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { GraphRateLimiterService } from './graph-rate-limiter.service';

@Injectable()
export class GraphClientService {
  private readonly logger = new Logger(GraphClientService.name);
  private readonly clients = new Map<string, Client>();

  constructor(private readonly rateLimiter: GraphRateLimiterService) {}

  /**
   * Get or create Graph client for a tenant
   */
  getClient(tenantId: string, accessToken: string): Client {
    const cacheKey = `${tenantId}:${accessToken.slice(-10)}`;

    if (this.clients.has(cacheKey)) {
      return this.clients.get(cacheKey)!;
    }

    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    this.clients.set(cacheKey, client);
    return client;
  }

  /**
   * Execute Graph API request with rate limiting and retry
   */
  async executeWithRetry<T>(
    tenantId: string,
    accessToken: string,
    service: string,
    request: (client: Client) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    const client = this.getClient(tenantId, accessToken);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wait for rate limit slot
        await this.rateLimiter.acquire(tenantId, service);

        return await request(client);
      } catch (error: any) {
        const statusCode = error?.statusCode || error?.code;

        if (statusCode === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(error?.headers?.['retry-after'] || '60', 10);
          this.logger.warn(`Rate limited for tenant ${tenantId}, waiting ${retryAfter}s`);
          await this.sleep(retryAfter * 1000);
        } else if (statusCode >= 500 && attempt < maxRetries) {
          // Server error - exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`Server error ${statusCode}, retrying in ${delay}ms`);
          await this.sleep(delay);
        } else {
          throw error;
        }
      }
    }

    throw new Error('Max retries exceeded');
  }

  // ==================== Users ====================

  async getUsers(tenantId: string, accessToken: string, options?: {
    select?: string[];
    top?: number;
    skipToken?: string;
  }) {
    return this.executeWithRetry(tenantId, accessToken, 'general', async (client) => {
      let request = client.api('/users');

      if (options?.select) {
        request = request.select(options.select);
      }
      if (options?.top) {
        request = request.top(options.top);
      }
      if (options?.skipToken) {
        request = request.skiptoken(options.skipToken);
      }

      return request.get();
    });
  }

  async getUser(tenantId: string, accessToken: string, userId: string) {
    return this.executeWithRetry(tenantId, accessToken, 'general', (client) =>
      client.api(`/users/${userId}`).get(),
    );
  }

  // ==================== Mail ====================

  async getMailFolders(tenantId: string, accessToken: string, userId: string) {
    return this.executeWithRetry(tenantId, accessToken, 'outlook', (client) =>
      client.api(`/users/${userId}/mailFolders`).top(100).get(),
    );
  }

  async getMessages(tenantId: string, accessToken: string, userId: string, folderId: string, options?: {
    top?: number;
    skipToken?: string;
    deltaToken?: string;
  }) {
    return this.executeWithRetry(tenantId, accessToken, 'outlook', async (client) => {
      if (options?.deltaToken) {
        return client.api(`/users/${userId}/mailFolders/${folderId}/messages/delta`)
          .query({ $deltatoken: options.deltaToken })
          .get();
      }

      let request = client.api(`/users/${userId}/mailFolders/${folderId}/messages/delta`);

      if (options?.top) {
        request = request.top(options.top);
      }
      if (options?.skipToken) {
        request = request.skiptoken(options.skipToken);
      }

      return request.get();
    });
  }

  // ==================== Sites ====================

  async getSites(tenantId: string, accessToken: string, options?: {
    search?: string;
    top?: number;
  }) {
    return this.executeWithRetry(tenantId, accessToken, 'sharepoint', async (client) => {
      let request = client.api('/sites');

      if (options?.search) {
        request = request.query({ search: options.search });
      }
      if (options?.top) {
        request = request.top(options.top);
      }

      return request.get();
    });
  }

  async getSite(tenantId: string, accessToken: string, siteId: string) {
    return this.executeWithRetry(tenantId, accessToken, 'sharepoint', (client) =>
      client.api(`/sites/${siteId}`).get(),
    );
  }

  // ==================== Teams ====================

  async getTeams(tenantId: string, accessToken: string) {
    return this.executeWithRetry(tenantId, accessToken, 'teams', (client) =>
      client.api('/groups')
        .filter("resourceProvisioningOptions/Any(x:x eq 'Team')")
        .select(['id', 'displayName', 'description', 'visibility'])
        .top(100)
        .get(),
    );
  }

  async getTeamChannels(tenantId: string, accessToken: string, teamId: string) {
    return this.executeWithRetry(tenantId, accessToken, 'teams', (client) =>
      client.api(`/teams/${teamId}/channels`).get(),
    );
  }

  // ==================== OneDrive ====================

  async getDriveItems(tenantId: string, accessToken: string, userId: string, options?: {
    folderId?: string;
    top?: number;
    deltaToken?: string;
  }) {
    return this.executeWithRetry(tenantId, accessToken, 'general', async (client) => {
      const basePath = options?.folderId
        ? `/users/${userId}/drive/items/${options.folderId}/children`
        : `/users/${userId}/drive/root/children`;

      if (options?.deltaToken) {
        return client.api(`/users/${userId}/drive/root/delta`)
          .query({ $deltatoken: options.deltaToken })
          .get();
      }

      return client.api(basePath).top(options?.top || 100).get();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
