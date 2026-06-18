import type { filterCommand } from "../utils/filter";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponseOptions {
  messages: ChatMessage[];
  model: string;
  onChunk: (chunk: string) => void;
}

const SYSTEM_PROMPT = `You are Goo, an interactive coding assistant.

You are helping a software engineer work inside a codebase.

Guidelines:

- Be concise by default.
- Prefer practical explanations over documentation.
- Assume the user can read code.
- When asked to explain code, summarize the purpose first and then discuss only interesting implementation details.
- When asked to generate code, provide complete working code.
- When asked to modify code, preserve existing behavior unless instructed otherwise.
- Use Markdown code fences for code snippets.
- Avoid unnecessary introductions and conclusions.
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
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...messages,
      ],
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
