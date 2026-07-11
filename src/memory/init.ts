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

export async function initVault() {

  // folder is exit or not if not then it create one
  for (const folder of FOLDERS) {
    await mkdir(folder, {recursive: false})
  }

  console.log("folders created")

  const db = new Database(DB_PATH);
  db.run(`
     create table if not exists memories (
       id          text primary key,
       content     text not null,
       type        text default 'fact',
       tags        text default '[]',
       project     text,
       embedding   blob not null,
       created_at  text not null,
       file_path   text not null
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
