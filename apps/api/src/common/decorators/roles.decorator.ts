import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict endpoint access by user role.
 * Roles are hierarchical: OWNER > ADMIN > MEMBER > VIEWER
 * Usage: @Roles('ADMIN') allows ADMIN and OWNER
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
