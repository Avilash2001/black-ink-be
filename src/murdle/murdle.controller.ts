import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { MurdleService } from './murdle.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('murdle')
export class MurdleController {
  constructor(private readonly murdle: MurdleService) {}

  @UseGuards(AuthGuard)
  @Post()
  async generatePuzzle(@Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.murdle.generatePuzzle(userId);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  getMyMysteries(@Req() req: Request) {
    const userId = (req as any).user?.id;
    return this.murdle.getMyMysteries(userId);
  }

  @Get(':id')
  getGame(@Param('id') id: string) {
    return this.murdle.getGame(id);
  }

  @Post(':id/accuse')
  accuse(
    @Param('id') id: string,
    @Body() body: { who: string; how: string; where: string; why: string },
  ) {
    return this.murdle.accuse(id, body);
  }

  @Post(':id/give-up')
  giveUp(@Param('id') id: string) {
    return this.murdle.giveUp(id);
  }

  @Patch(':id/grid')
  updateGrid(
    @Param('id') id: string,
    @Body() body: { grid: Record<string, string> },
  ) {
    return this.murdle.updateGrid(id, body.grid);
  }

  @Post(':id/narrative')
  generateNarrative(@Param('id') id: string) {
    return this.murdle.generateNarrative(id);
  }
}
