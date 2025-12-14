import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { Session, SessionDocument } from './session.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private users: Model<UserDocument>,

    @InjectModel(Session.name)
    private sessions: Model<SessionDocument>,
  ) {}

  async login(email: string, userAgent: string, ipAddress: string) {
    let user = await this.users.findOne({ email });

    if (!user) {
      user = await this.users.create({ email });
    }

    const session = await this.sessions.create({
      user: user._id,
      userAgent,
      ipAddress,
    });

    return {
      id: session._id.toString(),
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    };
  }

  async getSession(sessionId: string) {
    const session = await this.sessions.findById(sessionId).populate('user');

    if (!session) return null;

    if (typeof session.user === 'string' || session.user instanceof Object) {
      // runtime safety check
    }

    const user =
      typeof session.user === 'object' && 'email' in session.user
        ? session.user
        : null;

    if (!user) return null;

    return {
      id: session._id.toString(),
      user: {
        id: user._id.toString(),
        email: user.email,
      },
    };
  }
}
