interface PullModelOptions {
  model: string;
  onProgress?: (progress: {
    status: string;
    completed?: number;
    total?: number;
    digest?: string;
  }) => void;
}

export async function pullModel({ model, onProgress }: PullModelOptions) {
  try {
    const response = await fetch("http://localhost:11434/api/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        stream: true,
      }),
    });

    if (!response.ok)
      throw new Error(
        `HTTP ${response.status}: ${response.statusText as string}`,
      );

    if (!response.body) {
      throw new Error("No body received yet!");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        const data = JSON.parse(line);
        onProgress?.(data);
      }
    }

    return true;
  } catch (error) {
    console.log("Error while pulling", error);
    throw error;
  }
}
