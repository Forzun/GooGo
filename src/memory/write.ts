import { Database } from "bun:sqlite"
import { join } from "node:path"
import { DB_PATH, VAULT_DIR } from "./init";
import { embed } from "./embed";

export interface Memory {
  id: string;
  content: string;
  type: "preference" | "fact" | "project" | "person" | "decision" | "error";
  tags: string[]
  project?: string
}

export async function saveMemory(memory: Memory): Promise<void> {
  const now = new Date().toISOString();
  const fileName = `${memory.id}.md`;
  const filePath = join(VAULT_DIR, "Memory", fileName)

  const frontmatter = [
    "---",
    `id: ${memory.id}`,
    `created: ${now}`,
    `type: ${memory.type}`,
    `tags: [${memory.tags.join(", ")}]`,
    memory.project ? `project: ${memory.project}` : null,
    "---",
    ].filter(Boolean).join("\n")

  await Bun.write(filePath, `${frontmatter}\n\n${memory.content}\n`)

  const vector = await embed(memory.content)

  const db = new Database(DB_PATH)
  db.run(
     `INSERT OR REPLACE INTO memories
      (id, content, type, tags, project, embedding, created_at, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
     [
       memory.id,
       memory.content,
       memory.type,
       JSON.stringify(memory.tags),
       memory.project ?? null,
       Buffer.from(vector.buffer),  // store Float32Array as binary blob
       now,
       filePath,
     ]
   )
  db.close()
}

export async function nextMemoryId(): Promise<string> {
  const db = new Database(DB_PATH)
  const row = db.query("SELECT COUNT(*) as count FROM memories").get() as { count: number }
  db.close()

  const n = (row.count + 1).toString().padStart(3, "0")
  return `memory-${n}`
}
