import type { ChatResponse } from "ollama";

interface OllamaResponse {
  message: {
    content: string;
    role: string;
  };
  done: boolean;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
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

export async function chatResponseStream({
  messages,
  model,
}: {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
    model: string;
    system?: string
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

export async function chat({
  messages,
  model,
}: {
  messages: ChatMessage[];
  model: string;
}) {
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error(`No response body`);

    const data = (await response.json()) as ChatResponse;
    return data.message.content;
  } catch (error) {
    console.error(error);
  }
}
