import {
  Body,
  Controller,
  Delete,
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
  createStory(
    @Req() req,
    @Body()
    body: {
      genre: string;
      protagonist: string;
      gender: 'male' | 'female' | 'non-binary';
      matureEnabled: boolean;
    },
  ) {
    return this.stories.createStory(
      req.user.id,
      body.genre,
      body.protagonist,
      body.gender,
      body.matureEnabled,
    );
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMyStories(@Req() req) {
    return this.stories.getMyStories(req.user.id);
  }

  @Get(':id')
  async getStory(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    return this.stories.getStory(id, user.id);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  deleteStory(@Req() req, @Param('id') id: string) {
    return this.stories.deleteStory(id, req.user.id);
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
