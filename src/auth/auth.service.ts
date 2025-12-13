import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private users: Repository<User>,

    @InjectRepository(Session)
    private sessions: Repository<Session>,
  ) {}

  async login(email: string, userAgent: string, ipAddress: string) {
    let user = await this.users.findOne({ where: { email } });

    if (!user) {
      user = this.users.create({ email });
      await this.users.save(user);
    }

    const session = this.sessions.create({
      user,
      userAgent,
      ipAddress,
    });

    await this.sessions.save(session);

    return session;
  }

  async getSession(sessionId: string) {
    return this.sessions.findOne({
      where: { id: sessionId },
      relations: ['user'],
    });
  }
}
