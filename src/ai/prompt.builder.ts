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
- Do NOT decide player actions
- Generate exactly TWO paragraphs
- Stay consistent with prior events
- Never mention being an AI
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
