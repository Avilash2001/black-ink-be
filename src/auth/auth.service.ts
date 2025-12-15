import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
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

  // ─────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────
  async register(name: string, email: string, password: string) {
    const existing = await this.users.findOne({ email });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.users.create({
      name,
      email,
      passwordHash,
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  }

  // ─────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────
  async login(
    email: string,
    password: string,
    userAgent: string,
    ipAddress: string,
  ) {
    const user = await this.users.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
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
        name: user.name,
        email: user.email,
      },
    };
  }

  // ─────────────────────────────────────
  // SESSION LOOKUP (USED BY GUARD)
  // ─────────────────────────────────────
  async getSession(sessionId: string) {
    const session = await this.sessions.findById(sessionId).populate('user');

    if (!session || typeof session.user !== 'object') {
      return null;
    }

    const user = session.user as UserDocument;

    return {
      id: session._id.toString(),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };
  }

  // ─────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────
  async logout(sessionId: string) {
    await this.sessions.findByIdAndDelete(sessionId);
  }
}
