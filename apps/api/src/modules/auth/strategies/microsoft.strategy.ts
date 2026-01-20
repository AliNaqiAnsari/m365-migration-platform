import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OIDCStrategy, IOIDCStrategyOption, IProfile } from 'passport-azure-ad';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(OIDCStrategy, 'microsoft') {
  private readonly logger = new Logger(MicrosoftStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const clientId = configService.get<string>('azure.clientId');
    const clientSecret = configService.get<string>('azure.clientSecret');
    const redirectUri = configService.get<string>('azure.redirectUri');

    const options: IOIDCStrategyOption = {
      identityMetadata:
        'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
      clientID: clientId || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      responseType: 'code',
      responseMode: 'form_post',
      redirectUrl: redirectUri || 'http://localhost:3001/api/v1/auth/microsoft/callback',
      allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: false,
      loggingLevel: 'warn',
      loggingNoPII: true,
    };

    super(options, (profile: IProfile, done: (err: Error | null, user?: unknown) => void) => {
      this.validate(profile, done);
    });
  }

  validate(profile: IProfile, done: (err: Error | null, user?: unknown) => void) {
    try {
      const user = {
        provider: 'microsoft' as const,
        providerId: profile.oid,
        email: profile._json?.email || profile._json?.preferred_username || '',
        name: profile.displayName || profile._json?.name || '',
        avatar: null,
      };

      this.logger.debug(`Microsoft SSO validated: ${user.email}`);
      done(null, user);
    } catch (error) {
      this.logger.error('Microsoft SSO validation failed', error);
      done(error as Error);
    }
  }
}
