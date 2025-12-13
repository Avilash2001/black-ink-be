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
    matureEnabled: boolean,
  ) {
    const story = this.stories.create({
      userId,
      genre,
      protagonist,
      matureEnabled,
    });

    await this.stories.save(story);

    // Initial story text (mock — AI comes later)
    const openingText = [
      `This is a ${genre.toLowerCase()} story.`,
      `${protagonist} stands at the beginning of something unknown.`,
    ];

    const combined = openingText.join(' ');
    const tokenCount = combined.split(' ').length;

    const node = this.nodes.create({
      story,
      parentNodeId: null,
      actionType: 'START',
      userInput: '',
      generatedText: combined,
      tokenStart: 0,
      tokenEnd: tokenCount,
    });

    await this.nodes.save(node);

    return {
      storyId: story.id,
      openingParagraphs: openingText,
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
    switch (action) {
      case 'DO':
        return [
          `You decide to ${text}.`,
          `The world reacts subtly to your action.`,
        ];
      case 'SAY':
        return [`"${text}," you say.`, `The words hang in the air.`];
      case 'SEE':
        return [`You focus on ${text}.`, `New details emerge.`];
      case 'STORY':
        return [`The story shifts as ${text}.`, `Reality reshapes itself.`];
      default:
        return [`Something happens.`, `The moment passes.`];
    }
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

    // 1️⃣ Find the node where rewindToken belongs
    const nodes = story.nodes;
    const rewindIndex = nodes.findIndex(
      (n) => n.tokenStart <= rewindToken && rewindToken <= n.tokenEnd,
    );

    if (rewindIndex === -1) {
      throw new Error('Invalid rewind token');
    }

    const validNodes = nodes.slice(0, rewindIndex + 1);

    // 2️⃣ Delete nodes AFTER rewind point
    const toDelete = nodes.slice(rewindIndex + 1);
    if (toDelete.length > 0) {
      await this.nodes.remove(toDelete);
    }

    // 3️⃣ Compute new token start
    const lastNode = validNodes[validNodes.length - 1];
    const tokenStart = rewindToken;

    const prompt = buildPrompt(story, validNodes, action, text);

    let aiText: string;

    try {
      aiText = await this.ai.generate(prompt);
    } catch {
      // fallback if Ollama fails
      aiText = this.generateMockTurn(action, text).join('\n\n');
    }

    const paragraphs = aiText
      .split('\n')
      .filter((p) => p.trim().length > 0)
      .slice(0, 2);
    const generatedText = paragraphs.join(' ');
    const tokenCount = generatedText.split(' ').length;
    const tokenEnd = tokenStart + tokenCount;

    // 5️⃣ Save new node
    const newNode = this.nodes.create({
      story,
      parentNodeId: lastNode.id,
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
}
