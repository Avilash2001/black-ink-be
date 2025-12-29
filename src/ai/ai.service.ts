import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly ollamaUrl = process.env.OLLAMA_URL!;
  private readonly ollamaModel = process.env.OLLAMA_MODEL!;

  private readonly apiKey = process.env.OPENROUTER_API_KEY!;
  private readonly model = process.env.OPENROUTER_MODEL!;
  private readonly baseUrl =
    process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

  private readonly useLocalModel =
    process.env.USE_LOCAL_MODEL! === 'true' ? true : false;

  async generate(prompt: string): Promise<string> {
    if (this.useLocalModel) {
      return this.generateLocal(prompt);
    }
    return this.generateCloud(prompt);
  }

  async generateLocal(prompt: string): Promise<string> {
    try {
      const res = await fetch(this.ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error('Ollama request failed');
      }

      const data = await res.json();
      return data.response as string;
    } catch (error) {
      console.log(error);
    }
  }

  removeBracketedText(input: string): string {
    return input.replace(/<[^>]*>|\{[^}]*\}|\[[^\]]*\]|\([^)]*\)/g, '').trim();
  }

  async generateCloud(prompt: string): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://blackink.app',
          'X-Title': 'Black Ink',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a narrative engine for interactive fiction.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.9,
          max_tokens: 350,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter error (${res.status}): ${text}`);
      }

      const data = await res.json();

      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty AI response');
      }

      // Cleanup artifacts like <s> [OUT]
      let cleanContent = this.removeBracketedText(content);

      return cleanContent.trim();
    } catch (error) {
      console.log({ error });
    }
  }

  async summarize(currentSummary: string, newContent: string): Promise<string> {
    const prompt = `
      You are a specialized summarizer for interactive fiction.
      
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
    `;

    // specific params for summarization to be faster/cheaper if needed,
    // but for now reusing generateCloud logic or similar
    try {
      // Reusing generateCloud structure but we might want a different system prompt or params
      // explicit call here to allow differentiation later
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://blackink.app',
          'X-Title': 'Black Ink',
        },
        body: JSON.stringify({
          model: this.model, // or a cheaper model like 4o-mini
          messages: [
            {
              role: 'system',
              content: 'You are a narrative summarizer.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.5, // Lower temp for factual summary
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter error (${res.status}): ${text}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error('Empty Summary response');
      return content.trim();
    } catch (error) {
      console.log('Summarization failed', error);
      return currentSummary + '\n' + newContent; // Fallback: just append if fail
    }
  }
}
