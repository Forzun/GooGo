// test-memory.ts

import { embed } from "./embed";
import { extractedMemory } from "./extract";
import { DB_PATH, initVault } from "./init";
import { searchMemories } from "./search";
import { nextMemoryId, saveMemory } from "./write";
const { Database } = await import("bun:sqlite");

// 1. init
// await initVault();
console.log("✓ vault initialized");

// 2. save a few test memories
// const memories = [
//   { content: "User prefers TypeScript over JavaScript", type: "preference", tags: ["coding", "typescript"] },
//   { content: "User is building a CLI tool called GooGo using Bun", type: "project", tags: ["project", "cli"] },
//   { content: "User likes dark terminal themes", type: "preference", tags: ["ui", "terminal"] },
//   { content: "User's name is Bhavesh", type: "person", tags: ["personal"] },
// ];

// for (const mem of memories) {
//   const id = await nextMemoryId();
//   await saveMemory({ id, ...mem as any });
//   console.log(`✓ saved ${id}: ${mem.content.slice(0, 40)}...`);
// }
//
//1. not store memory in SQLite
//2. every information have its own chunks
//3.

console.log("2. Embedding");
const vec = await embed("the user prefers TypeScript");
console.log(`   ✓ vector length: ${vec.length}`);           // expect 768
console.log(`   ✓ first value:   ${vec[0]?.toFixed(6)}\n`);

console.log("3. Clearing old test memories");
const db = new Database(DB_PATH);
db.run("DELETE FROM memories");
db.close();
console.log("   ✓ table cleared\n");

console.log("4. Saving memories");
const testMemories = [
  { content: "User prefers TypeScript over JavaScript",         type: "preference", tags: ["coding", "typescript"] },
  { content: "User is building a CLI tool called GooGo using Bun", type: "project",    tags: ["project", "cli"] },
  { content: "User prefers dark terminal UI themes for their development environment "  ,type: "preference", tags: ["ui", "terminal"] },
  { content: "User's name is Bhavesh",                         type: "person",     tags: ["personal"] },
];

for (const mem of testMemories) {
  const id = await nextMemoryId();
  await saveMemory({ id, ...mem as any })
  console.log(`   ✓ ${id}: ${mem.content}`);
}

console.log("\n5. Verify DB");
const db2 = new Database(DB_PATH);
const rows = db2.query(
  "SELECT id, content, length(embedding) as embLen FROM memories"
).all() as any[];
db2.close();

rows.forEach(r => {
  const ok = r.embLen === 3072;
  console.log(`   ${ok ? "✓" : "✗"} ${r.id}  embedding: ${r.embLen} bytes ${ok ? "" : "← WRONG, should be 3072"}`);
})

console.log("\n6. Semantic Search");
const searches = [
  { query: "what coding language does the user like?",  expectTop: "TypeScript" },
  { query: "tell me about the project they are building", expectTop: "GooGo" },
  { query: "what is the user's name?",                  expectTop: "Bhavesh" },
  { query: "what kind of UI does the user prefer?",     expectTop: "terminal" },
];

let searchPassed = 0;
for (const { query, expectTop } of searches) {
  const results = await searchMemories(query, 3, 0.5);
  const top = results[0];
  const passed = top?.content.includes(expectTop);
  console.log(`\n   query: "${query}"`);
  if (results.length === 0) {
    console.log(`   ✗ no results returned (threshold too high?)`);
  } else {
    results.forEach((r, i) => {
      const marker = i === 0 ? (passed ? "✓" : "✗") : " ";
      console.log(`   ${marker} ${r.score.toFixed(3)}  ${r.content}`);
    });
    if (!passed) {
      console.log(`   ✗ expected top result to contain "${expectTop}"`);
    } else {
      searchPassed++;
    }
  }
}

console.log(`\n   ${searchPassed}/${searches.length} searches correct`);

console.log("\n7. Memory Extraction");
const extracted = await extractedMemory(
  "I always write TypeScript without semicolons and use 2 space indentation",
  "Understood, I'll follow your style preferences in future code suggestions",
  "llama3.1:8b"  // ← change to whatever model you're using
);

if (extracted.length === 0) {
  console.log("   ✗ nothing extracted — check your extract.ts prompt or model");
} else {
  extracted.forEach(m => {
    console.log(`   ✓ [${m.type}] ${m.content}`);
    console.log(`     tags: ${m.tags.join(", ")}`);
  });
}

console.log("\n8. Vault Files (check in Obsidian)");
const { readdir } = await import("node:fs/promises");
const { join } = await import("node:path");
const { homedir } = await import("node:os");
const memDir = join(homedir(), ".goo", "vault", "Memory");
const files = await readdir(memDir);
files.forEach(f => console.log(`   ✓ ~/.goo/vault/Memory/${f}`));

// ── summary ───────────────────────────────────────────────────────────────────
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  Done. Check ✗ lines above for failures.");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
