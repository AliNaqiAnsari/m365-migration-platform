import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@m365-migration/database';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRISMA') private prisma: PrismaClient,
    private config: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(data: { email: string; password: string; name: string; organizationName: string }) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const slug = data.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const org = await this.prisma.organization.create({
      data: {
        name: data.organizationName,
        slug: `${slug}-${crypto.randomBytes(3).toString('hex')}`,
        users: {
          create: {
            email: data.email,
            passwordHash,
            name: data.name,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = org.users[0];
    return this.generateTokens(user.id, user.email, org.id, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id, user.email, user.organizationId, user.role);
  }

  async refreshToken(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const user = session.user;
    const accessToken = this.signAccessToken(user.id, user.email, user.organizationId, user.role);

    return { accessToken, refreshToken: newRefreshToken, expiresIn: 900 };
  }

  async createApiKey(organizationId: string, userId: string, name: string) {
    const key = `m365_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.slice(0, 12);

    await this.prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix,
        organizationId,
        createdBy: userId,
      },
    });

    return { key, keyPrefix }; // Key is only shown once
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        organization: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email, isActive: true } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If an account exists, a reset link has been sent' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token in user metadata (using mfaSecret field temporarily for reset token)
    // In production, use a dedicated PasswordReset table
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: `reset:${resetTokenHash}:${Date.now() + 3600000}` },
    });

    await this.emailService.sendPasswordReset(email, resetToken).catch((err) => {
      console.error(`Failed to send password reset email to ${email}:`, err);
    });

    return { message: 'If an account exists, a reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with this reset token
    const users = await this.prisma.user.findMany({
      where: { mfaSecret: { startsWith: `reset:${tokenHash}:` } },
    });

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = users[0];
    const parts = user.mfaSecret!.split(':');
    const expiresAt = parseInt(parts[2], 10);

    if (Date.now() > expiresAt) {
      throw new UnauthorizedException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mfaSecret: null },
    });

    // Invalidate all sessions
    await this.prisma.session.deleteMany({ where: { userId: user.id } });

    return { message: 'Password reset successfully' };
  }

  private async generateTokens(userId: string, email: string, organizationId: string, role: string) {
    const accessToken = this.signAccessToken(userId, email, organizationId, role);
    const refreshToken = crypto.randomBytes(64).toString('hex');

    await this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private signAccessToken(userId: string, email: string, organizationId: string, role: string): string {
    return jwt.sign(
      { sub: userId, email, organizationId, role },
      this.config.get<string>('jwt.secret')!,
      { expiresIn: this.config.get<string>('jwt.accessExpiry') ?? '15m' } as jwt.SignOptions,
    );
  }
}
