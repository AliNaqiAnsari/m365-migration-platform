import { Job } from 'bullmq';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import pino from 'pino';

export interface MigrationJobData {
  jobId: string;
  organizationId: string;
  taskId: string;
  sourceTenantId: string;
  destinationTenantId: string;
  sourceId: string;
  destinationType: string;
  options: Record<string, any>;
}

export interface ProcessorResult {
  success: boolean;
  itemsProcessed: number;
  itemsFailed: number;
  bytesTransferred: number;
  errors: string[];
}

export abstract class BaseProcessor {
  protected logger = pino({
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  });

  abstract process(job: Job<MigrationJobData>): Promise<ProcessorResult>;

  protected async getGraphClient(tenantId: string): Promise<Client> {
    // In production, this would retrieve stored credentials from the database
    const credential = new ClientSecretCredential(
      tenantId,
      process.env.AZURE_CLIENT_ID!,
      process.env.AZURE_CLIENT_SECRET!,
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    });

    return Client.initWithMiddleware({
      authProvider,
    });
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Handle rate limiting
        if (error.statusCode === 429) {
          const retryAfter = parseInt(error.headers?.['retry-after'] || '60', 10);
          this.logger.warn({ retryAfter }, 'Rate limited, waiting...');
          await this.delay(retryAfter * 1000);
          continue;
        }

        // Handle transient errors
        if (error.statusCode >= 500) {
          const delay = baseDelay * Math.pow(2, attempt);
          this.logger.warn({ attempt, delay }, 'Transient error, retrying...');
          await this.delay(delay);
          continue;
        }

        // Non-retryable error
        throw error;
      }
    }

    throw lastError;
  }

  protected formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
