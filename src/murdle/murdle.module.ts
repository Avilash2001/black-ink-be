import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MurdleGame, MurdleGameSchema } from './murdle.schema';
import { MurdleService } from './murdle.service';
import { MurdleController } from './murdle.controller';
import { AiModule } from 'src/ai/ai.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MurdleGame.name, schema: MurdleGameSchema },
    ]),
    AiModule,
    AuthModule,
  ],
  controllers: [MurdleController],
  providers: [MurdleService],
})
export class MurdleModule {}
