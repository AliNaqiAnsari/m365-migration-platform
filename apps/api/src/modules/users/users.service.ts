import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { PrismaClient, UserRole } from '@m365-migration/database';

@Injectable()
export class UsersService {
  constructor(
    @Inject('PRISMA') private prisma: PrismaClient,
    private config: ConfigService,
  ) {}

  async list(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        authProvider: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(
    organizationId: string,
    invitedBy: string,
    data: { email: string; role?: string },
  ) {
    // Check if already a member
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email, organizationId },
    });
    if (existing) throw new ConflictException('User is already a member of this organization');

    // Check for existing pending invitation
    const existingInvite = await this.prisma.invitation.findUnique({
      where: { organizationId_email: { organizationId, email: data.email } },
    });
    if (existingInvite && !existingInvite.acceptedAt) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.invitation.upsert({
      where: { organizationId_email: { organizationId, email: data.email } },
      create: {
        organizationId,
        email: data.email,
        role: (data.role as UserRole) ?? 'MEMBER',
        token,
        invitedBy,
        expiresAt,
      },
      update: {
        token,
        role: (data.role as UserRole) ?? 'MEMBER',
        invitedBy,
        expiresAt,
        acceptedAt: null,
      },
    });

    // TODO: Send invitation email via EmailService
    const inviteUrl = `${this.config.get('frontendUrl')}/invite/${token}`;

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      inviteUrl,
    };
  }

  async acceptInvite(token: string, data: { name: string; password: string }) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.acceptedAt) throw new BadRequestException('Invitation already accepted');
    if (invitation.expiresAt < new Date()) throw new BadRequestException('Invitation expired');

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: invitation.email,
        name: data.name,
        passwordHash,
        role: invitation.role,
        organizationId: invitation.organizationId,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async updateRole(
    userId: string,
    organizationId: string,
    newRole: string,
    actingUserId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Cannot change own role
    if (userId === actingUserId) {
      throw new BadRequestException('Cannot change your own role');
    }

    // Cannot change OWNER role
    if (user.role === 'OWNER') {
      throw new BadRequestException('Cannot change the owner role');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole as UserRole },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async remove(userId: string, organizationId: string, actingUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (userId === actingUserId) {
      throw new BadRequestException('Cannot remove yourself');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException('Cannot remove the organization owner');
    }

    await this.prisma.session.deleteMany({ where: { userId } });
    await this.prisma.user.delete({ where: { id: userId } });

    return { message: 'User removed' };
  }

  async getPendingInvitations(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        email: true,
        role: true,
        invitedBy: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
