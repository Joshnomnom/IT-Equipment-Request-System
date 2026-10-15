import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AuthService, PublicUser } from './auth.service';
import { AUTH_COOKIE } from './auth.types';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: PublicUser }> {
    const { accessToken, user } = await this.authService.login(dto);
    // The token never reaches JavaScript: httpOnly means document.cookie
    // can't read it, so an XSS bug can't steal the session.
    res.cookie(AUTH_COOKIE, accessToken, {
      ...this.cookieOptions(),
      maxAge: Number(this.config.get('JWT_EXPIRES_IN_SECONDS', 86400)) * 1000,
    });
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.authService.getProfile(user.id);
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      // Strict: the browser never attaches the cookie to requests that start
      // on another site, which is our CSRF protection.
      sameSite: 'strict',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/',
    };
  }
}
