import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Story,
  StoryDocument,
  StoryNode,
  StoryNodeDocument,
} from './story.schema';
import { AiService } from '../ai/ai.service';
import { buildPrompt } from '../ai/prompt.builder';

@Injectable()
export class StoriesService {
  constructor(
    @InjectModel(Story.name)
    private storyModel: Model<StoryDocument>,
    @InjectModel(StoryNode.name)
    private storyNodeModel: Model<StoryNodeDocument>,
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
    });

    let aiText: string;
    // For initial prompt, we have no nodes yet
    const prompt = buildPrompt(story, [], 'SYSTEM', '');

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

    await this.storyNodeModel.create({
      storyId: story._id,
      actionType: 'SYSTEM',
      userInput: '',
      generatedText,
      tokenStart: 0,
      tokenEnd: tokenCount,
    });

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

    // Fetch existing nodes sorted by order creation
    const existingNodes = await this.storyNodeModel
      .find({ storyId: story._id })
      .sort({ createdAt: 1 });

    const rewindIndex = existingNodes.findIndex(
      (n) => n.tokenStart <= rewindToken && rewindToken <= n.tokenEnd,
    );

    if (rewindIndex === -1) {
      throw new Error('Invalid rewind token');
    }

    // Keep nodes up to the rewind point
    const keptNodes = existingNodes.slice(0, rewindIndex + 1);

    // Delete nodes that are being rewound over (if any)
    const nodesToDelete = existingNodes.slice(rewindIndex + 1);
    if (nodesToDelete.length > 0) {
      await this.storyNodeModel.deleteMany({
        _id: { $in: nodesToDelete.map((n) => n._id) },
      });
    }

    const prompt = buildPrompt(story, keptNodes, action, text);
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

    await this.storyNodeModel.create({
      storyId: story._id,
      actionType: action,
      userInput: text,
      generatedText,
      tokenStart,
      tokenEnd,
    });

    return {
      paragraphs,
      tokenStart,
      tokenEnd,
    };
  }

  async getStory(storyId: string, userId: string) {
    const story = await this.storyModel
      .findOne({
        _id: storyId,
        userId,
      })
      .lean();

    if (!story) return null;

    const nodes = await this.storyNodeModel
      .find({ storyId: story._id })
      .sort({ createdAt: 1 })
      .lean();

    return {
      ...story,
      nodes,
    };
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

    // cleanup nodes
    await this.storyNodeModel.deleteMany({ storyId });

    return { success: true };
  }
}
