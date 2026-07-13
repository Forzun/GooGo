export async function embed(text: string) {
  try {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         model: "mxbai-embed-large",
         prompt: text,
       }),
    })

    if (!res.ok) {
      throw new Error(`Embedding failed: ${res.status} ${await res.text()}`)
    }

    const data = await res.json() as { embedding: number[] };
    return new Float32Array(data.embedding)
  } catch (error) {
    throw new Error('Error while fetching embeddings')
 }
}
