import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get('google.clientId') || 'not-configured',
      clientSecret: configService.get('google.clientSecret') || 'not-configured',
      callbackURL:
        configService.get('google.redirectUri') ||
        'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      const user = {
        provider: 'google' as const,
        providerId: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
        avatar: profile.photos?.[0]?.value || null,
      };

      this.logger.debug(`Google SSO validated: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error('Google SSO validation failed', error);
      done(error as Error);
    }
  }
}
