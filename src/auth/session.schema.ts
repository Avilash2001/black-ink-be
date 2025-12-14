import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User, UserDocument } from './user.schema';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Session {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId | UserDocument;

  @Prop()
  userAgent: string;

  @Prop()
  ipAddress: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
