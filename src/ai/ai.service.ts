import { Injectable } from '@nestjs/common';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';
const CLAUDE_VERSION = '2023-06-01';

@Injectable()
export class AiService {
  private readonly claudeKey = process.env.CLAUDE_KEY!;

  // ── Core Claude call ──────────────────────────────────────────────────────

  private async callClaude(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 600,
    temperature = 1,
  ): Promise<string> {
    const body: Record<string, any> = {
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    };

    // Claude supports temperature only when not using extended thinking;
    // keep it simple and pass it in every non-JSON call.
    if (temperature !== 1) {
      body.temperature = temperature;
    }

    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.claudeKey,
        'anthropic-version': CLAUDE_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error(`Empty Claude response: ${JSON.stringify(data)}`);
    }

    return content.trim();
  }

  // ── Story generation (replaces OpenRouter generate / generateLocal) ───────

  async generate(prompt: string): Promise<string> {
    const system = [
      'You are a narrative engine for interactive fiction.',
      'Output ONLY plain prose — no JSON, no markdown, no code fences, no headings.',
      'Write exactly two paragraphs separated by a blank line.',
      'Every sentence must be complete. No trailing ellipsis.',
    ].join('\n');

    return this.callClaude(system, prompt, 600, 1);
  }

  // ── Running story summarizer ──────────────────────────────────────────────

  async summarize(currentSummary: string, newContent: string): Promise<string> {
    const system = [
      'You are a specialized summarizer for interactive fiction.',
      'Return only the updated summary text — no labels, no headings, no JSON.',
    ].join('\n');

    const userPrompt = `
CURRENT SUMMARY:
${currentSummary || 'None'}

NEW RECENT EVENTS:
${newContent}

INSTRUCTION:
Update the summary to include the new events.
- Keep it concise (max 300 words).
- Retain key plot points, character names, and current state.
- Discard minor dialogue or transient details.
- Write in present tense.
    `.trim();

    try {
      return await this.callClaude(system, userPrompt, 500, 0.3);
    } catch (error) {
      console.error('Summarization failed', error);
      // Fallback: just append rather than losing context
      return `${currentSummary}\n${newContent}`;
    }
  }

  // ── JSON generation (used by Murdle) ─────────────────────────────────────

  async generateJson(prompt: string): Promise<string> {
    const system =
      'You are a JSON-generating puzzle designer. Output only valid JSON, no markdown, no explanation.';

    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.claudeKey,
        'anthropic-version': CLAUDE_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Claude API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error(`Empty Claude response: ${JSON.stringify(data)}`);
    }

    return content.trim();
  }
}
