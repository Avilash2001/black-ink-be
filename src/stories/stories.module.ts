import { Module } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Story, StorySchema } from './story.schema';
import { AiModule } from 'src/ai/ai.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Story.name, schema: StorySchema }]),
    AiModule,
    AuthModule,
  ],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
