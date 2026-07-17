import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os"

export const GOO_DIR = join(homedir(), ".goo")
export const VAULT_DIR = join(GOO_DIR , "vault")
export const DB_PATH = join(GOO_DIR , "vector.db")
export const CONFIG_PATH = join(GOO_DIR, "config.json")

const FOLDERS = [
  join(VAULT_DIR, "Daily"),
  join(VAULT_DIR, "Memory"),
  join(VAULT_DIR, "People"),
  join(VAULT_DIR, "Preferences"),
  join(VAULT_DIR, "Projects")
]

const stubs = [
  {path: join(VAULT_DIR, "Preferences", "Index.md"), content: "# Preferences\n\nAll user preferences are linked here.\n" },
  { path: join(VAULT_DIR, "Projects", "GooGo.md"), content: "# GooGo\n\nTerminal AI chat CLI built with Bun and Ollama.\n" },
  { path: join(VAULT_DIR, "tags"),isDir: true },
]

export async function initVault() {

  // folder is exit or not if not then it create one
  for (const folder of FOLDERS) {
    await mkdir(folder, {recursive: true})
  }

  for (const stub of stubs) {
    if (stub.isDir) {
      await mkdir(stub.path , {recursive: true})
    } else {
      const file = Bun.file(stub.path);
      console.log("running here")
      if (!(await file.exists())) {
        await Bun.write(stub.path , stub.content!)
      }
    }
  }

  console.log("folders created")

  const db = new Database(DB_PATH);
  db.run(`
    CREATE TABLE IF NOT EXISTS chunks (
      id           TEXT PRIMARY KEY,      -- "memory-001-0", "bhavesh-0", "googo-1"
      file_path    TEXT NOT NULL,
      chunk_index  INTEGER NOT NULL,
      embedding    BLOB NOT NULL,
      file_hash    TEXT NOT NULL,         -- detect stale entries
      updated_at   TEXT NOT NULL,
      UNIQUE(file_path, chunk_index)      -- one row per chunk per file
    )
  `);
db.close()

console.log("data base created")

  const configFile = Bun.file(CONFIG_PATH);
  if (!(await configFile.exists())) {
    await Bun.write(CONFIG_PATH, JSON.stringify({
      vault: VAULT_DIR,
      embeddingModel: "nomic-embed-text",
      maxMemoriesInjected: 8,
      confidenceThreshold: 3.65,
      autoSave: false,
    }, null, 5))
  }

  console.log("✓ Goo vault initialized at ~/.goo");
}
