import { getEmbeddingModels } from "../ollama/client"

export async function topEmbedding(): Promise<string | null>{
  return getEmbeddingModels().then(models => {
    if (models.length == 0) return null
    const top = models.reduce((max, current) => current.size > max!.size ? current : max)
    return top?.name
  })
}
