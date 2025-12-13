import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(
    @Body('email') email: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(
      email,
      req.headers['user-agent'] || 'unknown',
      req.ip,
    );

    res.cookie('session', session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });

    return {
      userId: session.user.id,
      email: session.user.email,
    };
  }
}
