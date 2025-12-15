import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Story, StoryDocument } from './story.schema';
import { AiService } from '../ai/ai.service';
import { buildPrompt } from '../ai/prompt.builder';

@Injectable()
export class StoriesService {
  constructor(
    @InjectModel(Story.name)
    private storyModel: Model<StoryDocument>,
    private ai: AiService,
  ) {}

  async createStory(
    userId: string,
    genre: string,
    protagonist: string,
    gender: 'male' | 'female' | 'non-binary',
    matureEnabled: boolean,
  ) {
    const story = await this.storyModel.create({
      userId,
      genre,
      protagonist,
      gender,
      matureEnabled,
      nodes: [],
    });

    let aiText: string;
    const prompt = buildPrompt(story, story.nodes, 'SYSTEM', '');

    try {
      aiText = await this.ai.generate(prompt);
    } catch {
      aiText = `${protagonist} stands at the edge of something unknown.\n\nThe world waits.`;
    }

    const paragraphs = aiText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);

    const generatedText = paragraphs.join(' ');
    const tokenCount = generatedText.split(/\s+/).length;

    story.nodes.push({
      actionType: 'SYSTEM',
      userInput: '',
      generatedText,
      tokenStart: 0,
      tokenEnd: tokenCount,
    });

    await story.save();

    return {
      storyId: story._id.toString(),
      openingParagraphs: paragraphs,
    };
  }

  async submitTurn(
    storyId: string,
    userId: string,
    action: string,
    text: string,
    rewindToken: number,
  ) {
    const story = await this.storyModel.findOne({
      _id: storyId,
      userId,
    });

    if (!story) throw new NotFoundException();

    const nodes = story.nodes;

    const rewindIndex = nodes.findIndex(
      (n) => n.tokenStart <= rewindToken && rewindToken <= n.tokenEnd,
    );

    if (rewindIndex === -1) {
      throw new Error('Invalid rewind token');
    }

    story.nodes = nodes.slice(0, rewindIndex + 1);

    const prompt = buildPrompt(story, story.nodes, action, text);
    const aiText = await this.ai.generate(prompt);

    const paragraphs = aiText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);

    const generatedText = paragraphs.join(' ');
    const tokenCount = generatedText.split(/\s+/).length;
    const tokenStart = rewindToken;
    const tokenEnd = tokenStart + tokenCount;

    story.nodes.push({
      actionType: action,
      userInput: text,
      generatedText,
      tokenStart,
      tokenEnd,
    });

    await story.save();

    return {
      paragraphs,
      tokenStart,
      tokenEnd,
    };
  }

  async getStory(storyId: string, userId: string) {
    return this.storyModel.findOne({
      _id: storyId,
      userId,
    });
  }

  async getMyStories(userId: string) {
    return this.storyModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .select('_id genre protagonist createdAt updatedAt');
  }

  async deleteStory(storyId: string, userId: string) {
    const res = await this.storyModel.deleteOne({
      _id: storyId,
      userId,
    });

    if (res.deletedCount === 0) {
      throw new NotFoundException();
    }

    return { success: true };
  }
}
