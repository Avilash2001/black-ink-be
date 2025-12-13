import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { StoriesService } from './stories.service';
import { AuthGuard } from '../auth/auth.guard';
import { SubmitTurnDto } from './dto/submit-turn.dto';
@Controller('stories')
@UseGuards(AuthGuard)
export class StoriesController {
  constructor(private stories: StoriesService) {}

  @Post()
  async create(
    @Body('genre') genre: string,
    @Body('protagonist') protagonist: string,
    @Body('matureEnabled') matureEnabled: boolean,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    return this.stories.createStory(user.id, genre, protagonist, matureEnabled);
  }

  @Get(':id')
  async getStory(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.stories.getStory(id, user.id);
  }

  @Post(':id/turn')
  async submitTurn(
    @Param('id') id: string,
    @Body() body: SubmitTurnDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;

    return this.stories.submitTurn(
      id,
      user.id,
      body.action,
      body.text,
      body.rewindToken,
    );
  }
}
