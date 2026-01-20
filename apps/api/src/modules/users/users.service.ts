import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by ID
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true },
    });
  }

  /**
   * Find user by email (across all organizations)
   */
  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });
  }

  /**
   * Find user by email within organization
   */
  async findByEmailInOrganization(organizationId: string, email: string) {
    return this.prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: email.toLowerCase(),
        },
      },
      include: { organization: true },
    });
  }

  /**
   * List users in organization
   */
  async findByOrganization(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
    },
  ) {
    const { page = 1, limit = 20, search, role } = options || {};
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(role && { role: role.toUpperCase() as any }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          authProvider: true,
          avatar: true,
          mfaEnabled: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Create new user in organization
   */
  async create(data: {
    organizationId: string;
    email: string;
    name?: string;
    password?: string;
    role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
    authProvider?: 'LOCAL' | 'MICROSOFT' | 'GOOGLE';
    authProviderId?: string;
  }) {
    // Check if user already exists in organization
    const existing = await this.findByEmailInOrganization(data.organizationId, data.email);
    if (existing) {
      throw new ConflictException('User already exists in this organization');
    }

    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 12)
      : undefined;

    return this.prisma.user.create({
      data: {
        organizationId: data.organizationId,
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash,
        role: data.role || 'MEMBER',
        authProvider: data.authProvider || 'LOCAL',
        authProviderId: data.authProviderId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        authProvider: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update user
   */
  async update(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
      avatar?: string;
    },
  ) {
    // Verify user belongs to organization
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete user
   */
  async delete(id: string, organizationId: string) {
    // Verify user belongs to organization
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting the last owner
    if (user.role === 'OWNER') {
      const ownerCount = await this.prisma.user.count({
        where: { organizationId, role: 'OWNER' },
      });

      if (ownerCount <= 1) {
        throw new ConflictException('Cannot delete the last owner of the organization');
      }
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found or password not set');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ConflictException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }
}
