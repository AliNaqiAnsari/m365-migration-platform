// ============================================================================
// Authentication Types
// ============================================================================

import type { UUID, Timestamps } from './common';

export type AuthProvider = 'local' | 'microsoft' | 'google';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User extends Timestamps {
  id: UUID;
  organizationId: UUID;
  email: string;
  name: string | null;
  passwordHash?: string;
  role: UserRole;
  authProvider: AuthProvider;
  authProviderId?: string;
  avatar?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
}

export interface Session {
  id: UUID;
  userId: UUID;
  organizationId: UUID;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: Omit<User, 'passwordHash' | 'mfaSecret'>;
  requireMfa?: boolean;
  tempToken?: string;
}

export interface MfaVerifyRequest {
  tempToken: string;
  code: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
}

export interface JwtPayload {
  sub: UUID;
  email: string;
  organizationId: UUID;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}
