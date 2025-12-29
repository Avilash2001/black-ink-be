import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type StoryDocument = HydratedDocument<Story>;
export type StoryNodeDocument = HydratedDocument<StoryNode>;

@Schema({ timestamps: true })
export class StoryNode {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Story',
    required: true,
    index: true,
  })
  storyId: Types.ObjectId;

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

export const StoryNodeSchema = SchemaFactory.createForClass(StoryNode);

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

  @Prop({ required: false })
  summary: string;
}

export const StorySchema = SchemaFactory.createForClass(Story);
