import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoriesModule } from './stories/stories.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'adventure',
      password: 'adventure',
      database: 'adventure',
      autoLoadEntities: true,
      synchronize: true, // dev only
    }),
    StoriesModule,
    AuthModule,
    AiModule,
  ],
})
export class AppModule {}
