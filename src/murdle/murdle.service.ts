import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MurdleGame, MurdleGameDocument } from './murdle.schema';
import { AiService } from '../ai/ai.service';

const PUZZLE_PROMPT = `Create an original murder mystery logic puzzle and return it as JSON matching this exact schema:

{
  "title": string,         // "DETECTIVE X SOLVES THE MYSTERY OF THE Y"
  "intro": string,         // one dramatic sentence about the crime
  "suspects": [            // exactly 4 items
    { "name": string, "description": string, "color": "crimson"|"blue"|"gold"|"magenta" }
  ],
  "weapons": [             // exactly 4 items
    { "name": string, "description": string }
  ],
  "locations": [           // exactly 4 items
    { "name": string, "description": string }
  ],
  "motives": [             // exactly 4 items
    { "name": string, "description": string }
  ],
  "solution": {
    "murderer": string,    // exact name of one suspect
    "assignments": [       // exactly 4 items, one per suspect
      { "suspect": string, "weapon": string, "location": string, "motive": string }
    ]
  },
  "clues": [string],       // 8-10 clues (see clue rules below)
  "statements": [          // exactly 4 items, one per suspect
    { "suspect": string, "text": string }
  ]
}

Constraints:
- Every weapon, location, and motive appears exactly once across the 4 assignments
- Clues reference suspects by trait or role (not by name) when possible
- Innocent suspects make TRUE statements; the murderer makes a FALSE statement
- Use a creative theme (gothic, sci-fi, Victorian, noir, etc.)
- Each suspect gets one of the four colors, no repeats

CLUE RULES — this is mandatory and must be followed exactly:
- Each clue MUST reference exactly 2 of the 4 categories: suspects, weapons, locations, motives
- No clue may reference only 1 category or 3+ categories
- Each clue must link those two categories with a logical deduction (positive or negative)
- Valid category pairs per clue: (suspect+weapon), (suspect+location), (suspect+motive), (weapon+location), (weapon+motive), (location+motive)
- Examples of valid 2-category clues:
    "The person in the greenhouse did not use the rope." — (location + weapon)
    "The one driven by jealousy carried the candlestick." — (motive + weapon)
    "The solicitor was not present at the chapel." — (suspect + location)
    "Whoever used the poison vial acted out of greed." — (weapon + motive)
- Clues can be both positive ("The priest was in the bedroom.") or negative ("The person in the greenhouse did not use the rope"), but must be definitive and not ambiguous
- Do NOT write clues like "The jealous solicitor used the rope in the library." — that references 4 categories
- Do NOT write clues like "Someone was in the library." — that references only 1 category
- Together the clues must uniquely identify the full solution`;

@Injectable()
export class MurdleService {
  constructor(
    @InjectModel(MurdleGame.name)
    private murdleModel: Model<MurdleGameDocument>,
    private ai: AiService,
  ) {}

  private extractJson(text: string): any {
    // Strip markdown code fences if present
    const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
    // Match outermost JSON object
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in AI response');
    const obj = JSON.parse(match[0]);
    // Handle case where AI wraps content under a key like "puzzle"
    if (!obj.title && typeof obj === 'object') {
      const firstKey = Object.keys(obj)[0];
      if (firstKey && obj[firstKey]?.title) return obj[firstKey];
    }
    return obj;
  }

  private validatePuzzle(p: any): void {
    const required = [
      'title',
      'intro',
      'suspects',
      'weapons',
      'locations',
      'motives',
      'clues',
      'statements',
      'solution',
    ];
    const missing = required.filter((k) => !p[k]);
    if (missing.length > 0) {
      throw new Error(`Parsed puzzle missing fields: ${missing.join(', ')}`);
    }
    if (!Array.isArray(p.suspects) || p.suspects.length !== 4) {
      throw new Error('Puzzle must have exactly 4 suspects');
    }
  }

  async generatePuzzle(userId?: string): Promise<{ gameId: string }> {
    let parsed: any;

    // Attempt once, retry once on failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await this.ai.generateJson(PUZZLE_PROMPT);
        console.log(
          `[Murdle] Raw AI response (attempt ${attempt}):`,
          raw?.slice(0, 300),
        );
        parsed = this.extractJson(raw);
        this.validatePuzzle(parsed);
        break;
      } catch (err) {
        console.error(`[Murdle] Attempt ${attempt} failed:`, err);
        if (attempt === 1) {
          throw new Error(`Failed to generate valid puzzle JSON: ${err}`);
        }
      }
    }

    const game = await this.murdleModel.create({
      userId: userId ?? null,
      title: parsed.title,
      intro: parsed.intro,
      suspects: parsed.suspects,
      weapons: parsed.weapons,
      locations: parsed.locations,
      motives: parsed.motives,
      clues: parsed.clues,
      statements: parsed.statements,
      solution: parsed.solution,
      solved: false,
      givenUp: false,
      playerGrid: {},
      playerAccusation: null,
    });

    return { gameId: String(game._id) };
  }

  async getMyMysteries(userId: string) {
    return this.murdleModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .select('_id title intro solved givenUp createdAt')
      .lean();
  }

  async getGame(id: string) {
    const game = await this.murdleModel.findById(id).lean();
    if (!game) throw new NotFoundException('Game not found');

    // Hide solution unless game is over
    if (!game.solved && !game.givenUp) {
      const { solution: _solution, ...rest } = game as any;
      void _solution;
      return rest;
    }

    return game;
  }

  async accuse(
    id: string,
    accusation: { who: string; how: string; where: string; why: string },
  ): Promise<{ correct: boolean; solution?: any }> {
    const game = await this.murdleModel.findById(id);
    if (!game) throw new NotFoundException('Game not found');

    if (game.solved || game.givenUp) {
      return { correct: game.solved, solution: game.solution };
    }

    const solution = game.solution;
    const murdererAssignment = solution.assignments.find(
      (a) => a.suspect === solution.murderer,
    );

    const correct =
      accusation.who === solution.murderer &&
      accusation.how === murdererAssignment?.weapon &&
      accusation.where === murdererAssignment?.location &&
      accusation.why === murdererAssignment?.motive;

    game.playerAccusation = accusation;

    if (correct) {
      game.solved = true;
      await game.save();
      return { correct: true, solution };
    }

    await game.save();
    return { correct: false };
  }

  async giveUp(id: string): Promise<{ solution: any }> {
    const game = await this.murdleModel.findById(id);
    if (!game) throw new NotFoundException('Game not found');

    game.givenUp = true;
    await game.save();

    return { solution: game.solution };
  }

  async updateGrid(
    id: string,
    grid: Record<string, string>,
  ): Promise<{ ok: boolean }> {
    const game = await this.murdleModel.findById(id);
    if (!game) throw new NotFoundException('Game not found');

    game.playerGrid = grid;
    await game.save();
    return { ok: true };
  }
}
