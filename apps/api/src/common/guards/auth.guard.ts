import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import type { PrismaClient } from '@m365-migration/database';

interface ClerkJwtPayload {
  sub: string;          // Clerk user ID
  email?: string;
  name?: string;
  org_id?: string;
  org_role?: string;
  azp?: string;         // Authorized party (frontend URL)
  iss?: string;         // Issuer (Clerk instance URL)
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private jwksClient: JwksClient | null = null;

  constructor(
    private config: ConfigService,
    @Inject('PRISMA') private prisma: PrismaClient,
  ) {}

  private getJwksClient(): JwksClient {
    if (!this.jwksClient) {
      const clerkIssuer = this.config.get<string>('clerk.issuer');
      if (!clerkIssuer) {
        throw new UnauthorizedException('Clerk issuer not configured');
      }
      this.jwksClient = new JwksClient({
        jwksUri: `${clerkIssuer}/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 600_000, // 10 minutes
        rateLimit: true,
      });
    }
    return this.jwksClient;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    // Check API key first (for CLI usage)
    if (token.startsWith('m365_')) {
      return this.validateApiKey(token, request);
    }

    // Clerk JWT validation via JWKS
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      const client = this.getJwksClient();
      const key = await client.getSigningKey(decoded.header.kid);
      const signingKey = key.getPublicKey();

      const payload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
      }) as ClerkJwtPayload;

      // Find or create local user from Clerk identity
      const user = await this.findOrCreateUser(payload);

      request.user = {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`JWT verification failed: ${error}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async findOrCreateUser(payload: ClerkJwtPayload) {
    const clerkId = payload.sub;
    const email = payload.email;

    // Try to find user by Clerk external ID first
    let user = await this.prisma.user.findFirst({
      where: { authProviderId: clerkId },
    });

    if (user) return user;

    // Try to find by email
    if (email) {
      user = await this.prisma.user.findFirst({
        where: { email },
      });

      if (user) {
        // Link existing user to Clerk ID
        return this.prisma.user.update({
          where: { id: user.id },
          data: { authProviderId: clerkId },
        });
      }
    }

    // Auto-create user + organization for new Clerk users
    const name = payload.name || email?.split('@')[0] || 'User';
    const orgName = `${name}'s Organization`;
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const org = await this.prisma.organization.create({
      data: {
        name: orgName,
        slug,
        plan: 'FREE',
      },
    });

    return this.prisma.user.create({
      data: {
        email: email || `${clerkId}@clerk.local`,
        name,
        authProvider: 'CLERK',
        authProviderId: clerkId,
        organizationId: org.id,
        role: 'OWNER',
        passwordHash: '',
      },
    });
  }

  private async validateApiKey(key: string, request: any): Promise<boolean> {
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { organization: true },
    });

    if (!apiKey || !apiKey.isActive) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    request.user = {
      id: apiKey.createdBy,
      organizationId: apiKey.organizationId,
      role: 'ADMIN',
    };

    return true;
  }

  private extractToken(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return request.headers['x-api-key'];
  }
}
