interface ChatMessage {
  user: "user" | "assistant";
  content: string;
}

interface ChatResponseOptions {
  messages: ChatMessage[];
  model: string;
  onChunk: (chunk: string) => void;
}

export async function chatResponse({
  messages,
  model,
  onChunk,
}: ChatResponseOptions) {
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages,
        stream: true,
      }),
    });
    if (!response.body) throw new Error("No response body");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("/n").filter(Boolean);

      for (const line of lines) {
        const data = JSON.parse(line);
        const token = data.messages?.content || "";
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
