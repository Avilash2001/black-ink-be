import { Story, StoryNode } from 'src/stories/story.schema';

export function buildPrompt(
  story: Story,
  nodes: StoryNode[],
  action: string,
  text: string,
): string {
  const recentText = nodes.map((n) => n.generatedText).join('\n\n');

  let storyContext = '';
  if (story.summary) {
    storyContext = `
      PREVIOUS STORY SUMMARY:
      ${story.summary}

      RECENT EVENTS:
      ${recentText}
    `;
  } else {
    storyContext = `
      STORY SO FAR:
      ${recentText}
    `;
  }

  const baseRules = `
    You are a narrative engine for interactive fiction.

    GLOBAL RULES (DO NOT BREAK THESE):
    - Write strictly in second person ("you")
    - Never mention that you are an AI
    - Never describe choices, options, or commands
    - Never ask the reader what to do next
    - Do not break immersion
    - Do not summarize or recap
    - Generate exactly TWO paragraphs
    - Maintain tone, genre, and consequences
    - Stay consistent with prior events
    - Never break immersion
    ${story.matureEnabled ? '- Mature and explicit content is allowed' : '- Avoid explicit sexual content'}
  `.trim();

  if (action === 'SYSTEM') {
    return `
      ${baseRules}

      STORY SETUP:
      Genre: ${story.genre}
      Protagonist: ${story.protagonist}
      Gender: ${story.gender}

      Begin the story naturally. Do not rush. Establish atmosphere and tension.

      Start now.
    `.trim();
  }

  if (action === 'CONTINUE') {
    return `
      ${baseRules}

      ${storyContext}

      INSTRUCTION:
      Continue the story naturally.
      Let events unfold without user intervention.
      Advance the plot or deepen the current moment.
      Do not introduce new characters abruptly unless it makes sense.
      Do not resolve major arcs too quickly.

      Continue now.
    `.trim();
  }

  let actionInstruction = '';

  switch (action) {
    case 'DO':
      actionInstruction = `
        The protagonist attempts the following action:
        "${text}"

        Describe what happens as a result of this action.
        Include consequences, resistance, or unexpected outcomes if appropriate.
      `;
      break;

    case 'SAY':
      actionInstruction = `
        The protagonist says:
        "${text}"

        Describe how the world or other characters respond.
        Dialogue may be included, but do not overuse it.
      `;
      break;

    case 'SEE':
      actionInstruction = `
        The protagonist focuses their attention on:
        "${text}"

        Describe sensory details, atmosphere, or subtle changes.
      `;
      break;

    case 'STORY':
      actionInstruction = `
        The protagonist attempts to influence the direction of the story in this way:
        "${text}"

        Interpret this as intent, not narration control.
        Integrate it naturally into the world.
      `;
      break;
  }

  return `
    ${baseRules}

    ${storyContext}

    ${actionInstruction}

    Continue the story from this point.
  `.trim();
}
