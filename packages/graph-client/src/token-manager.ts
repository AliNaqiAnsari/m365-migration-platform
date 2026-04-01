import { ConfidentialClientApplication } from '@azure/msal-node';
import type { GraphClientConfig, GraphTokenResponse } from '@m365-migration/types';
import pino from 'pino';

const logger = pino({ name: 'token-manager' });

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class TokenManager {
  private cache = new Map<string, CachedToken>();
  private msalClients = new Map<string, ConfidentialClientApplication>();

  private getMsalClient(config: GraphClientConfig): ConfidentialClientApplication {
    const key = `${config.tenantId}:${config.clientId}`;
    let client = this.msalClients.get(key);
    if (!client) {
      client = new ConfidentialClientApplication({
        auth: {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authority: `https://login.microsoftonline.com/${config.tenantId}`,
        },
      });
      this.msalClients.set(key, client);
    }
    return client;
  }

  async getToken(config: GraphClientConfig): Promise<string> {
    const cacheKey = `${config.tenantId}:${config.clientId}`;
    const cached = this.cache.get(cacheKey);

    // Return cached token if still valid (with 5 minute buffer)
    if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.accessToken;
    }

    const client = this.getMsalClient(config);
    const scopes = config.scopes ?? ['https://graph.microsoft.com/.default'];

    try {
      const result = await client.acquireTokenByClientCredential({ scopes });
      if (!result?.accessToken) {
        throw new Error('No access token returned from MSAL');
      }

      this.cache.set(cacheKey, {
        accessToken: result.accessToken,
        expiresAt: result.expiresOn?.getTime() ?? Date.now() + 3600 * 1000,
      });

      logger.debug({ tenantId: config.tenantId }, 'Token acquired');
      return result.accessToken;
    } catch (error) {
      logger.error({ tenantId: config.tenantId, error }, 'Failed to acquire token');
      throw error;
    }
  }

  clearCache(tenantId?: string): void {
    if (tenantId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(tenantId)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
