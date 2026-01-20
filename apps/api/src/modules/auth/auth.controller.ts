import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  MfaVerifyDto,
  MfaEnableDto,
  MfaDisableDto,
  RefreshTokenDto,
} from './dto';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== Email/Password Authentication ====================

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user and organization' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const token = req.headers.authorization?.split(' ')[1] || '';
    return this.authService.logout(user.id, token);
  }

  // ==================== Password Reset ====================

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ==================== MFA ====================

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code and complete login' })
  @ApiBody({ type: MfaVerifyDto })
  async verifyMfa(@Body() dto: MfaVerifyDto) {
    return this.authService.verifyMfa(dto);
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup MFA for current user' })
  async setupMfa(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.setupMfa(user.id);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable MFA with verification code' })
  @ApiBody({ type: MfaEnableDto })
  async enableMfa(@CurrentUser() user: CurrentUserPayload, @Body() dto: MfaEnableDto) {
    return this.authService.enableMfa(user.id, dto.secret, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiBody({ type: MfaDisableDto })
  async disableMfa(@CurrentUser() user: CurrentUserPayload, @Body() dto: MfaDisableDto) {
    return this.authService.disableMfa(user.id, dto.code);
  }

  // ==================== Microsoft SSO ====================

  @Public()
  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Initiate Microsoft SSO login' })
  microsoftLogin() {
    // Passport will redirect to Microsoft
  }

  @Public()
  @Post('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  @ApiOperation({ summary: 'Microsoft SSO callback' })
  async microsoftCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as {
      provider: 'microsoft';
      providerId: string;
      email: string;
      name: string;
      avatar?: string;
    };

    const tokens = await this.authService.socialLogin(profile);
    const frontendUrl = this.configService.get('frontendUrl');

    // Redirect to frontend with tokens
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  // ==================== Google SSO ====================

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google SSO login' })
  googleLogin() {
    // Passport will redirect to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google SSO callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as {
      provider: 'google';
      providerId: string;
      email: string;
      name: string;
      avatar?: string;
    };

    const tokens = await this.authService.socialLogin(profile);
    const frontendUrl = this.configService.get('frontendUrl');

    // Redirect to frontend with tokens
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  // ==================== Current User ====================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }
}
