import { embed } from "./embed";
import { Database } from "bun:sqlite"
import { DB_PATH } from "./init";
import { hash } from "bun";
import { basename } from "node:path"
import { ClassificationType, isVariableDeclaration } from "typescript";

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
  type?: string;
  tags?: string[];
  score: number
}



export async function isStale(row: { file_path: string, file_hash: string | bigint }): Promise<boolean> {
  const file = Bun.file(row.file_path)
  if (!(await file.exists())) return true;
  const content = await file.text();
  const currentHash = hash(content);
  return currentHash !== row.file_hash
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
    "SELECT id, file_path, chunk_index, embedding, file_hash FROM chunks"
  ).all() as any[];
  db.close();

  const results = [];

  for (const row of rows) {
    // check if file was edited in Obsidian since last index
    const file = Bun.file(row.file_path)

    if (!(await file.exists())) continue

    const content = await file.text()
    const currentHash = Bun.hash(content).toString()

    if (currentHash !== row.file_hash) {
      indexFile(row.file_path).catch(() => { });
      continue;
    }

    const buf = row.embedding as Buffer
    const vec = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    const score = cosineSimilarity(queryVec, vec)

    if (score < threshold) continue

    const body = content.replace(/^---[\s\S]*?---\n/, "").trim();
    const chunks = chunkText(body)
    const chunkContent = chunks[row.chunk_index] ?? body;

    results.push({
      id: row.id,
      file_path: row.file_path,
      content: chunkContent,  // live content from file, not from SQLite
      score,
    });
  }

  return results.sort((a, b) => b.score - a.score)
    .slice(0, topK);
}


function chunkText(text: string, size = 200, overlap = 30): string[] {
  const words = text.split(/\s+/)
  if (words.length <= size) return [text];

  const chunks: string[] = [];

  // 200 - 30 = 170
  for (let i = 0; i < words.length; i += size - overlap){
    chunks.push(words.splice(i, i + size).join(" "));
    if (i + size >= words.length) break;
  }
  return chunks;
}


// update old content to new one
export async function indexFile(filePath: string) {
  const file = Bun.file(filePath);
  const raw = await file.text()

 const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();
 const fileHash = Bun.hash(raw).toString()
 const chunks = chunkText(body)
 const now = new Date().toISOString()

  const db = new Database(DB_PATH);

  db.run("DELETE FROM chunks WHERE file_path = ?", [filePath]);

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(chunks[i]!)
    const buf = Buffer.from(embedding.buffer)
    const id = `${basename(filePath , ".md")}-${i}`
    db.run(
      `INSERT OR REPLACE INTO chunks (id, file_path, chunk_index, embedding, file_hash, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, filePath, i, buf, fileHash, now]
    );
  }
  db.close()
}
