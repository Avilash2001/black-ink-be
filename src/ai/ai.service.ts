import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly OLLAMA_URL = 'http://localhost:11434/api/generate';
  private readonly MODEL = 'mistral:7b-instruct';

  async generate(prompt: string): Promise<string> {
    const res = await fetch(this.OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.MODEL,
        prompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error('Ollama request failed');
    }

    const data = await res.json();
    return data.response as string;
  }
}
