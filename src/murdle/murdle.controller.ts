import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { MurdleService } from './murdle.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('whodunit')
export class MurdleController {
  constructor(private readonly murdle: MurdleService) {}

  @UseGuards(AuthGuard)
  @Post()
  async generatePuzzle(@Req() req: Request) {
    const userId = (req as any).user?.id;
    const matureEnabled = (req as any).user?.matureEnabled ?? false;
    return this.murdle.generatePuzzle(userId, matureEnabled);
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

  @Post(':id/hint/:n')
  revealHint(@Param('id') id: string, @Param('n', ParseIntPipe) n: number) {
    return this.murdle.revealHint(id, n);
  }

  @Post(':id/narrative')
  generateNarrative(@Param('id') id: string) {
    return this.murdle.generateNarrative(id);
  }
}
