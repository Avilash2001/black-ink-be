import { Story } from '../stories/story.entity';
import { StoryNode } from '../stories/story-node.entity';

export function buildPrompt(
  story: Story,
  nodes: StoryNode[],
  action: string,
  text: string,
) {
  const history = nodes.map((n) => n.generatedText).join('\n\n');

  return `
You are a text-based interactive fiction engine.

Rules:
- Write in second person
- Generate exactly TWO paragraphs
- Describe consequences only
- Never decide or suggest player actions
- Never include commands or instructions
- Never say "Type", "Enter", "Try", or similar
- Never break immersion
- Never mention being a game or an AI
- Stay consistent with prior events

- Genre: ${story.genre}
- Protagonist: ${story.protagonist}
- Mature content allowed: ${story.matureEnabled}

Story so far:
${history}

Player action:
Type: ${action}
Intent: "${text}"

Continue the story.
`.trim();
}
