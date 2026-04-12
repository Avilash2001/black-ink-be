import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: false })
  matureEnabled: boolean;

  @Prop({ type: String, enum: ['dark', 'light'], default: 'dark' })
  theme: 'dark' | 'light';

  @Prop({ type: Date, default: null })
  dateOfBirth: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
