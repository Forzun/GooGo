import { Database } from "bun:sqlite"
import { DB_PATH } from "./init";
import { basename } from "node:path";
import { embed } from "./embed";


export function chunkText(text: string, size = 200, overlap = 30): string[] {
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
