import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MurdleGame, MurdleGameDocument } from './murdle.schema';
import { AiService } from '../ai/ai.service';

const FIVE_MIN_MS = 5 * 60 * 1000;
const TEN_MIN_MS = 10 * 60 * 1000;

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

  async generatePuzzle(
    userId?: string,
    matureEnabled = false,
  ): Promise<{ gameId: string }> {
    const matureAddendum = matureEnabled
      ? `\n\nIMPORTANT: The user has enabled mature content. Incorporate dark, visceral themes — graphic violence, gore, body horror, disturbing imagery, and sexual references are permitted and encouraged. Make the mystery genuinely unsettling and adult.`
      : '';

    let parsed: any;

    // Attempt once, retry once on failure
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await this.ai.generateJson(PUZZLE_PROMPT + matureAddendum);
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
      hints: [],
      hintsRevealedAt: [],
      solvedAt: null,
      givenUpAt: null,
    });

    // Generate hints in the background — does not block the response
    this.generateHintsForGame(game).catch((err) =>
      console.error('[Murdle] Hint generation failed:', err),
    );

    return { gameId: String(game._id) };
  }

  // ── Generate and persist hints ────────────────────────────────────────────

  private async generateHintsForGame(game: MurdleGameDocument): Promise<void> {
    const sol = game.solution;
    const assignmentLines = sol.assignments
      .map(
        (a) =>
          `  ${a.suspect}: weapon="${a.weapon}", location="${a.location}", motive="${a.motive}"`,
      )
      .join('\n');

    const prompt = `You are a murder mystery puzzle designer. Based on the following puzzle data, generate exactly 3 progressive hints to help players deduce the solution.

CLUES:
${game.clues.map((c, i) => `${i + 1}. ${c}`).join('\n')}

SUSPECT STATEMENTS (innocent suspects tell truth, murderer lies):
${game.statements.map((s) => `${s.suspect}: "${s.text}"`).join('\n')}

SOLUTION (context only — do NOT reveal directly in hints):
Murderer: ${sol.murderer}
${assignmentLines}

Return a JSON object with exactly this shape:
{
  "hints": [
    "hint_1_text",
    "hint_2_text",
    "hint_3_text"
  ]
}

Rules:
- Each hint must be a genuine logical deduction from the clues/statements above
- Hint 1: Reference ONE clue or statement to eliminate a single possibility or confirm one fact. Vague and subtle.
- Hint 2: Connect TWO pieces of evidence to make a more definitive deduction about the murderer's category (weapon, location, or motive).
- Hint 3: Combine three or more clues/statements so the murderer's identity is nearly unmistakable — but do not directly say their name.
- Write in detective reasoning style: "Notice that...", "Consider that...", "If you combine..."
- Never say "The murderer is [name]" in any hint`;

    const raw = await this.ai.generateJson(prompt);
    const parsed = this.extractJson(raw);

    if (!Array.isArray(parsed.hints) || parsed.hints.length !== 3) {
      throw new Error('Hint generation returned invalid shape');
    }

    await this.murdleModel.findByIdAndUpdate(game._id, {
      $set: { hints: parsed.hints },
    });
  }

  // ── Reveal a hint ─────────────────────────────────────────────────────────

  async revealHint(id: string, n: number): Promise<{ hint: string }> {
    if (n < 0 || n > 2) throw new BadRequestException('Invalid hint index');

    const game = await this.murdleModel.findById(id);
    if (!game) throw new NotFoundException('Game not found');

    if (game.solved || game.givenUp) {
      throw new BadRequestException('Game is already over');
    }

    if (!game.hints || game.hints.length < 3) {
      throw new BadRequestException(
        'Hints are still being prepared. Please try again in a moment.',
      );
    }

    // Already revealed — return it
    if (game.hintsRevealedAt?.[n]) {
      return { hint: game.hints[n] };
    }

    const now = Date.now();
    const createdAt = (game as any).createdAt as Date;

    // Check timing
    if (n === 0) {
      const availableAt = createdAt.getTime() + FIVE_MIN_MS;
      if (now < availableAt) {
        const secsLeft = Math.ceil((availableAt - now) / 1000);
        throw new BadRequestException(
          `Hint 1 unlocks in ${Math.ceil(secsLeft / 60)}m ${secsLeft % 60}s`,
        );
      }
    } else if (n === 1) {
      if (!game.hintsRevealedAt?.[0]) {
        throw new BadRequestException('Reveal Hint 1 first');
      }
      const availableAt = game.hintsRevealedAt[0].getTime() + FIVE_MIN_MS;
      if (now < availableAt) {
        const secsLeft = Math.ceil((availableAt - now) / 1000);
        throw new BadRequestException(
          `Hint 2 unlocks in ${Math.ceil(secsLeft / 60)}m ${secsLeft % 60}s`,
        );
      }
    } else {
      // n === 2
      if (!game.hintsRevealedAt?.[1]) {
        throw new BadRequestException('Reveal Hint 2 first');
      }
      const availableAt = game.hintsRevealedAt[1].getTime() + TEN_MIN_MS;
      if (now < availableAt) {
        const secsLeft = Math.ceil((availableAt - now) / 1000);
        throw new BadRequestException(
          `Hint 3 unlocks in ${Math.ceil(secsLeft / 60)}m ${secsLeft % 60}s`,
        );
      }
    }

    // Record reveal timestamp
    const revealedAt = [...(game.hintsRevealedAt ?? [])];
    revealedAt[n] = new Date();
    game.hintsRevealedAt = revealedAt;
    await game.save();

    return { hint: game.hints[n] };
  }

  // ── Compute hint availability timestamps ──────────────────────────────────

  private hintAvailability(game: MurdleGameDocument): (string | null)[] {
    const createdAt = (game as any).createdAt as Date;
    const r = game.hintsRevealedAt ?? [];

    return [
      new Date(createdAt.getTime() + FIVE_MIN_MS).toISOString(),
      r[0] ? new Date(r[0].getTime() + FIVE_MIN_MS).toISOString() : null,
      r[1] ? new Date(r[1].getTime() + TEN_MIN_MS).toISOString() : null,
    ];
  }

  async getMyMysteries(userId: string) {
    return this.murdleModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .select('_id title intro solved givenUp createdAt solvedAt givenUpAt')
      .lean();
  }

  async getGame(id: string) {
    const game = await this.murdleModel.findById(id);
    if (!game) throw new NotFoundException('Game not found');

    const revealedHints = (game.hints ?? []).filter(
      (_, i) => !!(game.hintsRevealedAt ?? [])[i],
    );

    const base = {
      _id: game._id,
      title: game.title,
      intro: game.intro,
      suspects: game.suspects,
      weapons: game.weapons,
      locations: game.locations,
      motives: game.motives,
      clues: game.clues,
      statements: game.statements,
      solved: game.solved,
      givenUp: game.givenUp,
      playerGrid: game.playerGrid,
      playerAccusation: game.playerAccusation,
      createdAt: (game as any).createdAt,
      solvedAt: game.solvedAt,
      givenUpAt: game.givenUpAt,
      hintsReady: (game.hints ?? []).length === 3,
      hintsRevealedAt: game.hintsRevealedAt ?? [],
      hintsAvailableAt: this.hintAvailability(game),
      revealedHints,
    };

    if (!game.solved && !game.givenUp) {
      return base;
    }

    return { ...base, solution: game.solution };
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
      game.solvedAt = new Date();
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
    game.givenUpAt = new Date();
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

  async generateNarrative(id: string): Promise<{ narrative: string }> {
    const game = await this.murdleModel.findById(id);
    if (!game) throw new NotFoundException('Game not found');

    // Only available after game is over
    if (!game.solved && !game.givenUp) {
      throw new Error('Narrative is only available after the game ends');
    }

    // Return cached narrative if already generated
    if (game.narrative) {
      return { narrative: game.narrative };
    }

    const sol = game.solution;
    const murdererAssignment = sol.assignments.find(
      (a) => a.suspect === sol.murderer,
    );

    const assignmentLines = sol.assignments
      .map(
        (a) =>
          `- ${a.suspect}: weapon="${a.weapon}", location="${a.location}", motive="${a.motive}"`,
      )
      .join('\n');

    const prompt = `You are a noir detective narrator. Write a dramatic closing monologue (3-5 short paragraphs) that reveals the solution to this murder mystery.

Game title: ${game.title}
Intro: ${game.intro}

Suspects: ${game.suspects.map((s) => `${s.name} (${s.description})`).join('; ')}

The murderer is: ${sol.murderer}
They used: ${murdererAssignment?.weapon}
They were at: ${murdererAssignment?.location}
Their motive: ${murdererAssignment?.motive}

Full assignments:
${assignmentLines}

INSTRUCTIONS — follow these EXACTLY:
- Write ONLY plain prose text. Do NOT return JSON. Do NOT wrap in any object, key, quotes, or code block.
- Write in first person as the detective closing the case.
- Name the murderer and explain how the clues pointed to them.
- Mention the weapon and location dramatically.
- Weave in the motive as the emotional climax.
- Give each innocent suspect a very brief alibi mention.
- Separate each paragraph with a blank line.
- End with a short punchy final line (one sentence).
- Maximum 250 words.
- Your response must start directly with the first word of the monologue.`;

    const raw = await this.ai.generateJson(prompt);

    // Robustly extract plain text — the model sometimes returns JSON anyway
    let text = raw.trim();

    // Strip markdown code fences
    text = text
      .replace(/^```[a-z]*\n?/gi, '')
      .replace(/```$/g, '')
      .trim();

    // If the result looks like JSON, try to unwrap it
    if (text.startsWith('{') || text.startsWith('"')) {
      try {
        const parsed = JSON.parse(text);
        // Find the first string value anywhere in the object
        const findStr = (obj: any): string | null => {
          if (typeof obj === 'string') return obj;
          if (typeof obj === 'object' && obj !== null) {
            for (const v of Object.values(obj)) {
              const found = findStr(v);
              if (found) return found;
            }
          }
          return null;
        };
        const extracted = findStr(parsed);
        if (extracted) text = extracted;
      } catch {
        // Not valid JSON — use as-is
      }
    }

    // Normalise literal \n escape sequences into real newlines
    text = text.replace(/\\n/g, '\n').trim();

    game.narrative = text;
    await game.save();

    return { narrative: text };
  }
}
