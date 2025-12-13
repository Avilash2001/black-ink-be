import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoriesModule } from './stories/stories.module';

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
  ],
})
export class AppModule {}
