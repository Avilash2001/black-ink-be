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
  ) {
    const story = await this.storyModel.findOne({
      _id: storyId,
      userId,
    });

    if (!story) throw new NotFoundException();

    // Fetch existing nodes sorted by order creation
    // Check if we need to summarize (every 5 turns)
    const totalNodes = await this.storyNodeModel.countDocuments({
      storyId: story._id,
    });

    if (totalNodes > 0 && totalNodes % 5 === 0) {
      const distinctNodes = await this.storyNodeModel
        .find({ storyId: story._id })
        .sort({ createdAt: -1 })
        .limit(5);

      // Restore chronological order for summary
      const nodesToSummarize = distinctNodes.reverse();
      const textToSummarize = nodesToSummarize
        .map((n) => n.generatedText)
        .join('\n');

      const newSummary = await this.ai.summarize(
        story.summary,
        textToSummarize,
      );

      story.summary = newSummary;
      await story.save();
    }

    // Fetch only recent nodes for context (sliding window)
    const recentNodesDesc = await this.storyNodeModel
      .find({ storyId: story._id })
      .sort({ createdAt: -1 })
      .limit(10); // Keep last 10 for immediate context

    const recentNodes = recentNodesDesc.reverse();

    const prompt = buildPrompt(story, recentNodes, action, text);

    let aiText: string;
    try {
      aiText = await this.ai.generate(prompt);
      if (!aiText) throw new Error('Empty response');
    } catch {
      aiText = `The story continues, though the path ahead is uncertain.`;
    }

    const paragraphs = aiText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);

    const generatedText = paragraphs.join(' ');
    const tokenCount = generatedText.split(/\s+/).length;

    // Calculate tokenStart based on the last node, or 0 if none
    // If recentNodes is not empty, the last one is the absolute last node of the story
    const lastNode = recentNodes[recentNodes.length - 1];

    // Fallback if no nodes found (shouldn't happen in submitTurn usually)
    const tokenStart = lastNode ? lastNode.tokenEnd : 0;
    const tokenEnd = tokenStart + tokenCount;

    const node = await this.storyNodeModel.create({
      storyId: story._id,
      actionType: action,
      userInput: text,
      generatedText,
      tokenStart,
      tokenEnd,
    });

    return {
      node,
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
