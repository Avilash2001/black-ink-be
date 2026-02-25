import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.auth.register(name, email, password);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(
      email,
      password,
      req.headers['user-agent'] || 'unknown',
      req.ip,
    );

    // Environment check for cookie settings
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('session', session.id, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax', // Lax for local dev
      secure: isProd, // Secure true only in prod
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return session.user;
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return req.user;
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateMe(
    @Req() req: any,
    @Body() body: { matureEnabled?: boolean },
  ) {
    return this.auth.updateUser(req.user.id, body);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = req.cookies?.session;
    if (sessionId) {
      await this.auth.logout(sessionId);
    }

    res.clearCookie('session');
    return { success: true };
  }
}
