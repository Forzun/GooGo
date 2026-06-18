interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponseOptions {
  messages: ChatMessage[];
  model: string;
  onChunk: (chunk: string) => void;
}

const systemPrompt = `
You are a terminal coding assistant.

Rules:
- Do not use markdown headings (#, ##, ###).
- Do not use bullet lists (-, *, +).
- Do not use bold (**text**) or italic formatting.
- Do not use code fences (\`\`\`).
- Use plain text only.
- Structure answers using simple labels.

Example:

Function: pickTheme()

Purpose:
Selects a random theme.

Returns:
A string containing the theme name.

Implementation:
Uses Math.random() to select an item from an array.
`;

export async function chatResponse({
  messages,
  model,
  onChunk,
}: ChatResponseOptions) {
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        const data = JSON.parse(line);
        const token = data.message?.content || "";
        fullResponse += token;
        onChunk(token);
      }
    }
    return fullResponse;
  } catch (error) {
    console.error("Chat error", error);
    throw error;
  }
}

export async function chatResponseStream({
  messages,
  model,
}: {
  messages: { role: "user" | "assistant"; content: string }[];
  model: string;
}) {
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: messages,
      stream: true,
    }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error(`No response body`);

  const reander = response.body.getReader();
  const decoder = new TextDecoder();

  return {
    async *[Symbol.asyncIterator]() {
      while (true) {
        const { done, value } = await reander.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          const data = JSON.parse(line);
          yield data.message?.content || "";
        }
      }
    },
  };
}
