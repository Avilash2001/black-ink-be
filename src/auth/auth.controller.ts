import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

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

    res.cookie('session', session.id, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    });

    return session.user;
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
