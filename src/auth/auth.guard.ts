import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const sessionId = req.cookies?.session;

    if (!sessionId) return false;

    const session = await this.auth.getSession(sessionId);
    if (!session) return false;

    (req as any).user = session.user;
    return true;
  }
}
