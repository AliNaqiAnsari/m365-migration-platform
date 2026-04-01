import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import type { PrismaClient } from '@m365-migration/database';

interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    @Inject('PRISMA') private prisma: PrismaClient,
  ) {}

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

    // JWT validation
    try {
      const payload = jwt.verify(
        token,
        this.config.get<string>('jwt.secret')!,
      ) as JwtPayload;

      request.user = {
        id: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        role: payload.role,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
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

    // Update last used
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    request.user = {
      id: apiKey.createdBy,
      organizationId: apiKey.organizationId,
      role: 'ADMIN', // API keys get admin role
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
