import {
  BadRequestException,
  ForbiddenException,
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
      dateOfBirth: user.dateOfBirth
        ? (user.dateOfBirth as Date).toISOString().split('T')[0]
        : null,
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
        matureEnabled: user.matureEnabled ?? false,
        theme: user.theme ?? 'dark',
        dateOfBirth: user.dateOfBirth
          ? (user.dateOfBirth as Date).toISOString().split('T')[0]
          : null,
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
        matureEnabled: user.matureEnabled ?? false,
        theme: user.theme ?? 'dark',
        dateOfBirth: user.dateOfBirth
          ? (user.dateOfBirth as Date).toISOString().split('T')[0]
          : null,
      },
    };
  }

  // ─────────────────────────────────────
  // UPDATE USER SETTINGS
  // ─────────────────────────────────────
  async updateUser(
    userId: string,
    patch: { matureEnabled?: boolean; theme?: 'dark' | 'light' },
  ) {
    const user = await this.users.findByIdAndUpdate(
      userId,
      { $set: patch },
      { new: true },
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      matureEnabled: user.matureEnabled ?? false,
      theme: user.theme ?? 'dark',
      dateOfBirth: user.dateOfBirth
        ? (user.dateOfBirth as Date).toISOString().split('T')[0]
        : null,
    };
  }

  // ─────────────────────────────────────
  // UPDATE PROFILE (name / email)
  // ─────────────────────────────────────
  async updateProfile(
    userId: string,
    patch: { name?: string; email?: string },
  ) {
    if (patch.email) {
      const existing = await this.users.findOne({
        email: patch.email,
        _id: { $ne: userId },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    const user = await this.users.findByIdAndUpdate(
      userId,
      { $set: patch },
      { new: true },
    );

    if (!user) throw new BadRequestException('User not found');

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      matureEnabled: user.matureEnabled ?? false,
      theme: user.theme ?? 'dark',
      dateOfBirth: user.dateOfBirth
        ? (user.dateOfBirth as Date).toISOString().split('T')[0]
        : null,
    };
  }

  // ─────────────────────────────────────
  // SET DATE OF BIRTH (one-time, permanent)
  // ─────────────────────────────────────
  async setDateOfBirth(userId: string, dob: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (user.dateOfBirth) {
      throw new ForbiddenException(
        'Date of birth has already been set and cannot be changed',
      );
    }

    const date = new Date(dob);
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');

    user.dateOfBirth = date;
    await user.save();

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      matureEnabled: user.matureEnabled ?? false,
      theme: user.theme ?? 'dark',
      dateOfBirth: date.toISOString().split('T')[0],
    };
  }

  // ─────────────────────────────────────
  // CHANGE PASSWORD
  // ─────────────────────────────────────
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { success: true };
  }

  // ─────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────
  async logout(sessionId: string) {
    await this.sessions.findByIdAndDelete(sessionId);
  }
}
