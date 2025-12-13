import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story } from './story.entity';
import { StoryNode } from './story-node.entity';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Story, StoryNode]), AuthModule, AiModule],
  providers: [StoriesService],
  controllers: [StoriesController],
})
export class StoriesModule {}
