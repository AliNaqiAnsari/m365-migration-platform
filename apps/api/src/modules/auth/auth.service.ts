import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MfaService } from './mfa.service';

import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MfaVerifyDto,
  RefreshTokenDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mfaService: MfaService,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Login with email/password
   */
  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      const tempToken = await this.createTempToken(user.id);
      return {
        requireMfa: true,
        tempToken,
      };
    }

    return this.generateTokens(user);
  }

  /**
   * Verify MFA code and complete login
   */
  async verifyMfa(dto: MfaVerifyDto) {
    const userId = await this.validateTempToken(dto.tempToken);
    const user = await this.usersService.findById(userId);

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('Invalid MFA session');
    }

    const isValid = this.mfaService.verify(user.mfaSecret, dto.code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    return this.generateTokens(user);
  }

  /**
   * Register new user and organization
   */
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create organization and user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: this.generateSlug(dto.organizationName),
          billingEmail: dto.email,
        },
      });

      // Create user as owner
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'OWNER',
          authProvider: 'LOCAL',
          emailVerified: false,
        },
        include: {
          organization: true,
        },
      });

      return { organization, user };
    });

    // TODO: Send verification email

    return this.generateTokens(result.user);
  }

  /**
   * Social login (Microsoft/Google)
   */
  async socialLogin(profile: {
    provider: 'microsoft' | 'google';
    providerId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    // Check if user exists
    let user = await this.usersService.findByEmail(profile.email);

    if (user) {
      // Update provider info if needed
      if (!user.authProviderId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: profile.provider.toUpperCase() as 'MICROSOFT' | 'GOOGLE',
            authProviderId: profile.providerId,
            avatar: profile.avatar || user.avatar,
            emailVerified: true,
          },
          include: {
            organization: true,
          },
        });
      }
    } else {
      // Create new user and organization
      const result = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: `${profile.name}'s Organization`,
            slug: this.generateSlug(profile.name),
            billingEmail: profile.email,
          },
        });

        return tx.user.create({
          data: {
            organizationId: organization.id,
            email: profile.email,
            name: profile.name,
            role: 'OWNER',
            authProvider: profile.provider.toUpperCase() as 'MICROSOFT' | 'GOOGLE',
            authProviderId: profile.providerId,
            avatar: profile.avatar,
            emailVerified: true,
          },
          include: {
            organization: true,
          },
        });
      });

      user = result;
    }

    return this.generateTokens(user);
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      // Find session by refresh token
      const session = await this.prisma.session.findUnique({
        where: { refreshToken: dto.refreshToken },
        include: { user: { include: { organization: true } } },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Delete old session
      await this.prisma.session.delete({ where: { id: session.id } });

      // Generate new tokens
      return this.generateTokens(session.user);
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout (invalidate session)
   */
  async logout(userId: string, token: string) {
    await this.prisma.session.deleteMany({
      where: {
        userId,
        token,
      },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // TODO: Generate reset token and send email
    this.logger.log(`Password reset requested for: ${dto.email}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Reset password
   */
  async resetPassword(dto: ResetPasswordDto) {
    // TODO: Validate reset token
    // For now, throw not implemented
    throw new BadRequestException('Password reset not yet implemented');
  }

  /**
   * Setup MFA
   */
  async setupMfa(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mfaService.generateSecret(user.email);
  }

  /**
   * Enable MFA
   */
  async enableMfa(userId: string, secret: string, code: string) {
    const isValid = this.mfaService.verify(secret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });

    return { message: 'MFA enabled successfully' };
  }

  /**
   * Disable MFA
   */
  async disableMfa(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const isValid = this.mfaService.verify(user.mfaSecret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    return { message: 'MFA disabled successfully' };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
    organization?: { id: string; name: string; slug: string };
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    const accessExpiry = this.configService.get('jwt.accessTokenExpiry', '15m');
    const refreshExpiry = this.configService.get('jwt.refreshTokenExpiry', '7d');

    // Parse expiry to calculate dates
    const accessExpiresAt = this.parseExpiry(accessExpiry);
    const refreshExpiresAt = this.parseExpiry(refreshExpiry);

    // Create session
    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: refreshExpiresAt,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor((accessExpiresAt.getTime() - Date.now()) / 1000),
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
        organization: user.organization,
      },
    };
  }

  /**
   * Create temporary token for MFA
   */
  private async createTempToken(userId: string): Promise<string> {
    const tempToken = uuidv4();

    // Store in Redis with 5 minute expiry (simplified: store in session table)
    await this.prisma.session.create({
      data: {
        userId,
        token: `mfa:${tempToken}`,
        refreshToken: tempToken,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    return tempToken;
  }

  /**
   * Validate temporary MFA token
   */
  private async validateTempToken(tempToken: string): Promise<string> {
    const session = await this.prisma.session.findFirst({
      where: {
        token: `mfa:${tempToken}`,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired MFA session');
    }

    // Delete temp session
    await this.prisma.session.delete({ where: { id: session.id } });

    return session.userId;
  }

  /**
   * Parse expiry string to Date
   */
  private parseExpiry(expiry: string): Date {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 15 * 60 * 1000); // Default 15 minutes
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * (multipliers[unit!] || 60 * 1000));
  }

  /**
   * Generate URL-friendly slug
   */
  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `${base}-${uuidv4().slice(0, 8)}`;
  }
}
