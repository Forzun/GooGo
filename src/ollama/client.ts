interface OllamaModel {
  models: {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: {
      format: string;
      family: string;
      families: string[] | null;
      parameter_size: string;
      quantization_level: string;
    };
  }[];
}

export async function listOllamaModels() {
  try {
    const response = await fetch("http://localhost:11434/api/tags");

    if (!response.ok) {
      throw new Error(`Ollama response with ${response.status}`);
    }
    const data = (await response.json()) as OllamaModel;
    let availableModels: { name: string; value: string }[] = [];

    for (const model of data.models) {
      availableModels.push({
        name: model.name,
        value: model.model,
      });
    }

    return availableModels;
  } catch (error) {
    console.error(error);
    return;
  }
}
