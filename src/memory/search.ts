import { embed } from "./embed";
import { Database } from "bun:sqlite"
import { DB_PATH } from "./init";
import type { BundledHighlighterOptions } from "shiki";

function cosineSimilarity(a: Float32Array, b: Float32Array): number{
  let dot = 0, magA = 0, magB = 0;
   for (let i = 0; i < a.length; i++) {
     dot  += a[i]! * b[i]!;
     magA += a[i]! * a[i]!;
     magB += b[i]! * b[i]!;
   }
   return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}


export interface SearchResult {
  id: string;
  content: string;
  type: string;
  tags: string[];
  score: number
}

export async function searchMemories(
  query: string,
  topK = 5,
  threshold = 0.65
): Promise<SearchResult[]> {
  // 1. embed the query using the same model
  const queryVec = await embed(query);

  // 2. load all memories from SQLite
  const db = new Database(DB_PATH);
  const rows = db.query(
    "SELECT id, content, type, tags, embedding FROM memories"
  ).all() as { id: string; content: string; type: string; tags: string; embedding: Buffer }[];
  db.close();

  if (rows.length === 0) return [];

  // 3. score each memory against the query
  const scored = rows.map(row => {
    const buf = row.embedding as Buffer
    const vec = new Float32Array(buf.buffer , buf.byteOffset , buf.byteLength / 4);
    const score = cosineSimilarity(queryVec, vec);
    return {
      id:      row.id,
      content: row.content,
      type:    row.type,
      tags:    JSON.parse(row.tags) as string[],
      score,
    };
  });

  return scored
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
