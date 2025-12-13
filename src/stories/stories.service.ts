import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Story } from './story.entity';
import { StoryNode } from './story-node.entity';
import { AiService } from '../ai/ai.service';
import { buildPrompt } from '../ai/prompt.builder';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private stories: Repository<Story>,

    @InjectRepository(StoryNode)
    private nodes: Repository<StoryNode>,

    private ai: AiService,
  ) {}

  async createStory(
    userId: string,
    genre: string,
    protagonist: string,
    gender: 'male' | 'female' | 'non-binary',
    matureEnabled: boolean,
  ) {
    const story = this.stories.create({
      userId,
      genre,
      protagonist,
      gender,
      matureEnabled,
    });

    await this.stories.save(story);

    // ── AI PROMPT FOR STORY OPENING ─────────────────
    const openingPrompt = `
      You are a story engine.

      Rules:
      - Write in second person
      - Generate exactly TWO paragraphs
      - Do NOT suggest actions or commands
      - Do NOT instruct the player
      - Never mention being an AI or a game
      - Begin naturally, in medias res if appropriate

      Genre: ${genre}
      Protagonist: ${protagonist}
      Mature content allowed: ${matureEnabled}
      Gender: ${gender}
      Refer to the protagonist using appropriate pronouns.


      Begin the story.
    `.trim();

    let aiText: string;

    try {
      aiText = await this.ai.generate(openingPrompt);
    } catch {
      // Hard fallback (should almost never happen)
      aiText = `${protagonist} stands at the edge of something unknown.\n\nThe world waits.`;
    }

    const paragraphs = aiText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);

    const generatedText = paragraphs.join(' ');
    const tokenCount = generatedText.split(/\s+/).length;

    const openingNode = this.nodes.create({
      story,
      parentNodeId: null,
      actionType: 'SYSTEM',
      userInput: '',
      generatedText,
      tokenStart: 0,
      tokenEnd: tokenCount,
    });

    await this.nodes.save(openingNode);

    return {
      storyId: story.id,
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
    const story = await this.stories.findOne({
      where: { id: storyId, userId },
      relations: ['nodes'],
      order: { nodes: { createdAt: 'ASC' } },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    const nodes = story.nodes;
    const rewindIndex = nodes.findIndex(
      (n) => n.tokenStart <= rewindToken && rewindToken <= n.tokenEnd,
    );

    if (rewindIndex === -1) {
      throw new Error('Invalid rewind token');
    }

    const validNodes = nodes.slice(0, rewindIndex + 1);

    const nodesToDelete = nodes.slice(rewindIndex + 1);
    if (nodesToDelete.length > 0) {
      await this.nodes.remove(nodesToDelete);
    }

    const prompt = buildPrompt(story, validNodes, action, text);

    let aiText: string;

    try {
      aiText = await this.ai.generate(prompt);
    } catch {
      aiText = this.generateMockTurn(action, text).join('\n\n');
    }

    const paragraphs = aiText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 2);

    const generatedText = paragraphs.join(' ');
    const tokenStart = rewindToken;
    const tokenCount = generatedText.split(/\s+/).length;
    const tokenEnd = tokenStart + tokenCount;

    const newNode = this.nodes.create({
      story,
      parentNodeId: validNodes[validNodes.length - 1].id,
      actionType: action,
      userInput: text,
      generatedText,
      tokenStart,
      tokenEnd,
    });

    await this.nodes.save(newNode);

    return {
      paragraphs,
      tokenStart,
      tokenEnd,
    };
  }

  async getStory(storyId: string, userId: string) {
    return this.stories.findOne({
      where: { id: storyId, userId },
      relations: ['nodes'],
      order: { nodes: { createdAt: 'ASC' } },
    });
  }

  private generateMockTurn(action: string, text: string): string[] {
    return [`You decide to ${text}.`, `The world responds in its own way.`];
  }

  async getMyStories(userId: string) {
    console.log({ userId });

    return this.stories.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      select: {
        id: true,
        genre: true,
        protagonist: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteStory(storyId: string, userId: string) {
    const story = await this.stories.findOne({
      where: { id: storyId, userId },
    });

    if (!story) {
      throw new Error('Story not found');
    }

    await this.stories.remove(story);

    return { success: true };
  }
}
