import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StoryDocument = HydratedDocument<Story>;

@Schema({ timestamps: true })
export class StoryNode {
  @Prop({ required: true })
  actionType: string;

  @Prop()
  userInput: string;

  @Prop({ required: true })
  generatedText: string;

  @Prop({ required: true })
  tokenStart: number;

  @Prop({ required: true })
  tokenEnd: number;
}

@Schema({ timestamps: true })
export class Story {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  genre: string;

  @Prop({ required: true })
  protagonist: string;

  @Prop({ required: true })
  gender: 'male' | 'female' | 'non-binary';

  @Prop({ default: false })
  matureEnabled: boolean;

  @Prop({ type: [StoryNode], default: [] })
  nodes: StoryNode[];
}

export const StorySchema = SchemaFactory.createForClass(Story);
