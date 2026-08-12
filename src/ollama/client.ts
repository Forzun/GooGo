import { extractedMemory } from "../memory/extract";

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

const BASE_URL = "http://localhost:11434"

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


export async function getEmbeddingModels(baseUrl: string = BASE_URL): Promise<{ name: string, size: number}[]>{
  try {
    const response = await fetch(`${baseUrl}/api/tags`)

    if (!response.ok) {
      throw new Error(`Ollama response with ${response.status}`);
    }
    const data = (await response.json()) as OllamaModel
    const allModels = data.models

    const embeddingModels = allModels.filter(model => {
      const nameLower = model.name.toLocaleLowerCase()
      const family = model.details?.family.toLocaleLowerCase() || ' ';
      return nameLower.includes('embed') || family.includes('embed')
    })

    return embeddingModels.map(m => (
      {
        name: m.name,
        size: m.size
      }
    ))
  } catch (error) {
    console.log("error while fetching embedding models", error)
    return []
  }
}
