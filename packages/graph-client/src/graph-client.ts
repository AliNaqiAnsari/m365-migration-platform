import type Redis from 'ioredis';
import pino from 'pino';
import type {
  GraphClientConfig,
  GraphBatchRequest,
  GraphBatchResponse,
  GraphPagedResponse,
  GraphUploadSession,
} from '@m365-migration/types';
import { TokenManager } from './token-manager';
import { RateLimiter } from './rate-limiter';

const logger = pino({ name: 'graph-client' });

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA_URL = 'https://graph.microsoft.com/beta';

export interface GraphClientOptions {
  config: GraphClientConfig;
  redis: Redis;
  useBeta?: boolean;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  rawResponse?: boolean;
  maxRetries?: number;
}

export class GraphClient {
  private config: GraphClientConfig;
  private tokenManager: TokenManager;
  private rateLimiter: RateLimiter;
  private baseUrl: string;

  constructor(options: GraphClientOptions) {
    this.config = options.config;
    this.tokenManager = new TokenManager();
    this.rateLimiter = new RateLimiter(options.redis);
    this.baseUrl = options.useBeta ? GRAPH_BETA_URL : GRAPH_BASE_URL;
  }

  /**
   * Make a rate-limited, retrying request to Graph API.
   */
  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, maxRetries = 5 } = options;
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const service = RateLimiter.classifyService(path);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Rate limit check
      const waitMs = await this.rateLimiter.acquire(this.config.tenantId, service);
      if (waitMs > 0) {
        logger.debug({ waitMs, service, tenantId: this.config.tenantId }, 'Rate limit wait');
        await this.sleep(waitMs);
      }

      const token = await this.tokenManager.getToken(this.config);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle 429 rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
          this.rateLimiter.recordThrottle(this.config.tenantId, service, retryMs);
          logger.warn({ attempt, retryMs, url }, 'Graph API 429 - throttled');
          await this.sleep(retryMs);
          continue;
        }

        // Handle transient server errors
        if (response.status >= 500 && attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
          logger.warn({ attempt, status: response.status, url, backoffMs }, 'Graph API server error, retrying');
          await this.sleep(backoffMs);
          continue;
        }

        // Handle auth expiry
        if (response.status === 401) {
          this.tokenManager.clearCache(this.config.tenantId);
          if (attempt < maxRetries) {
            logger.warn({ url }, 'Token expired, refreshing');
            continue;
          }
        }

        if (!response.ok) {
          const errorBody = await response.text();
          const error = new GraphApiError(
            `Graph API ${method} ${path} failed: ${response.status}`,
            response.status,
            errorBody,
            path,
          );
          throw error;
        }

        // 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        if (options.rawResponse) {
          return response as unknown as T;
        }

        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof GraphApiError) throw error;

        // Network errors — retry with backoff
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
          logger.warn({ attempt, error, url, backoffMs }, 'Network error, retrying');
          await this.sleep(backoffMs);
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Graph API request failed after ${maxRetries + 1} attempts: ${path}`);
  }

  /**
   * Iterate through all pages of a paged Graph API response.
   */
  async *paginate<T>(path: string, options?: { pageSize?: number; deltaToken?: string }): AsyncGenerator<T[], void, void> {
    let url = path;
    if (options?.pageSize) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}$top=${options.pageSize}`;
    }
    if (options?.deltaToken) {
      url = options.deltaToken; // Delta token IS the full URL
    }

    while (url) {
      const response = await this.request<GraphPagedResponse<T>>(url);
      if (response.value?.length > 0) {
        yield response.value;
      }

      // Store delta link if available (caller can save for incremental sync)
      if (response['@odata.deltaLink']) {
        (this as any)._lastDeltaLink = response['@odata.deltaLink'];
      }

      url = response['@odata.nextLink'] ?? '';
    }
  }

  /**
   * Get the delta link from the last paginate() call.
   */
  get lastDeltaLink(): string | undefined {
    return (this as any)._lastDeltaLink;
  }

  /**
   * Send a batch request (up to 20 requests per batch).
   */
  async batch(requests: GraphBatchRequest[]): Promise<GraphBatchResponse[]> {
    if (requests.length > 20) {
      throw new Error('Graph API batch limit is 20 requests');
    }
    const response = await this.request<{ responses: GraphBatchResponse[] }>('/$batch', {
      method: 'POST',
      body: { requests },
    });
    return response.responses;
  }

  /**
   * Download a file as a readable stream (for streaming transfers).
   */
  async downloadStream(downloadUrl: string): Promise<ReadableStream<Uint8Array>> {
    const token = await this.tokenManager.getToken(this.config);
    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok || !response.body) {
      throw new GraphApiError(
        `Download failed: ${response.status}`,
        response.status,
        await response.text(),
        downloadUrl,
      );
    }
    return response.body;
  }

  /**
   * Create an upload session for large file uploads (>4MB).
   */
  async createUploadSession(
    path: string,
    fileName: string,
    conflictBehavior: 'rename' | 'replace' | 'fail' = 'replace',
  ): Promise<GraphUploadSession> {
    return this.request<GraphUploadSession>(`${path}/createUploadSession`, {
      method: 'POST',
      body: {
        item: {
          '@microsoft.graph.conflictBehavior': conflictBehavior,
          name: fileName,
        },
      },
    });
  }

  /**
   * Upload a chunk to an existing upload session.
   */
  async uploadChunk(
    uploadUrl: string,
    chunk: ArrayBuffer,
    rangeStart: number,
    rangeEnd: number,
    totalSize: number,
  ): Promise<unknown> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': chunk.byteLength.toString(),
        'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${totalSize}`,
      },
      body: chunk,
    });

    if (!response.ok && response.status !== 202) {
      throw new GraphApiError(
        `Upload chunk failed: ${response.status}`,
        response.status,
        await response.text(),
        uploadUrl,
      );
    }

    if (response.status === 200 || response.status === 201) {
      return response.json(); // Upload complete, returns the DriveItem
    }

    return response.json(); // 202 = more chunks needed
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'GraphApiError';
  }

  get isThrottled(): boolean {
    return this.statusCode === 429;
  }
  get isTransient(): boolean {
    return this.statusCode >= 500;
  }
  get isAuthError(): boolean {
    return this.statusCode === 401;
  }
  get isPermissionError(): boolean {
    return this.statusCode === 403;
  }
  get isNotFound(): boolean {
    return this.statusCode === 404;
  }
  get isConflict(): boolean {
    return this.statusCode === 409;
  }
}
