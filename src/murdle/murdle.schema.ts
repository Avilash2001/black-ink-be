import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MurdleGameDocument = MurdleGame & Document;

export class Suspect {
  name: string;
  description: string;
  color: string;
}

export class Item {
  name: string;
  description: string;
}

export class Statement {
  suspect: string;
  text: string;
}

export class Assignment {
  suspect: string;
  weapon: string;
  location: string;
  motive: string;
}

export class Solution {
  murderer: string;
  assignments: Assignment[];
}

@Schema({ timestamps: true })
export class MurdleGame {
  @Prop() userId: string;

  @Prop() title: string;

  @Prop() intro: string;

  @Prop({ type: [Object] }) suspects: Suspect[];

  @Prop({ type: [Object] }) weapons: Item[];

  @Prop({ type: [Object] }) locations: Item[];

  @Prop({ type: [Object] }) motives: Item[];

  @Prop({ type: [String] }) clues: string[];

  @Prop({ type: [Object] }) statements: Statement[];

  @Prop({ type: Object }) solution: Solution;

  @Prop({ default: false }) solved: boolean;

  @Prop({ default: false }) givenUp: boolean;

  @Prop({ type: Object, default: {} }) playerGrid: Record<string, string>;

  @Prop({ type: Object, default: null })
  playerAccusation: {
    who: string;
    how: string;
    where: string;
    why: string;
  } | null;

  @Prop({ default: null }) narrative: string;
}

export const MurdleGameSchema = SchemaFactory.createForClass(MurdleGame);
