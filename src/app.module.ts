import { Module } from '@nestjs/common';
import { StoriesModule } from './stories/stories.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { MongooseModule } from '@nestjs/mongoose';

import * as dotenv from 'dotenv';
dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    StoriesModule,
    AuthModule,
    AiModule,
  ],
})
export class AppModule {}
