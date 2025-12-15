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

      return content.trim();
    } catch (error) {
      console.log({ error });
    }
  }
}
