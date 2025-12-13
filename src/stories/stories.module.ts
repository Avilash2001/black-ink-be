import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story } from './story.entity';
import { StoryNode } from './story-node.entity';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Story, StoryNode])],
  providers: [StoriesService],
  controllers: [StoriesController],
})
export class StoriesModule {}
