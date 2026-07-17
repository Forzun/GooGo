// test-full.ts
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { DB_PATH, initVault, VAULT_DIR } from "./init";
import { embed } from "./embed";
import { nextMemoryId, saveMemory } from "./write";
import { searchMemories } from "./search";
import { indexFile } from "./index.file";
import { extractedMemory } from "./extract";

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.log(`  ✗ ${label}${detail ? `\n    → ${detail}` : ""}`);
  failed++;
}

function section(title: string) {
  console.log(`\n━━━ ${title} ${"─".repeat(Math.max(0, 40 - title.length))}`);
}

// ── 1. init ───────────────────────────────────────────────────────────────────
section("1. Vault Init");
await initVault();

const { readdir } = await import("node:fs/promises");
const { homedir } = await import("node:os");
const folders = ["Memory", "People", "Projects", "Preferences", "Daily"];
for (const folder of folders) {
  const path = join(VAULT_DIR, folder);
  const exists = await Bun.file(path).exists().catch(() => false);
  // folders don't report exists via Bun.file — use readdir instead
  try {
    await readdir(path);
    ok(`~/.goo/vault/${folder}/ exists`);
  } catch {
    fail(`~/.goo/vault/${folder}/ missing`);
  }
}

const configExists = await Bun.file(join(homedir(), ".goo", "config.json")).exists();
configExists ? ok("config.json exists") : fail("config.json missing");

// ── 2. embedding ──────────────────────────────────────────────────────────────
section("2. Embedding");
const vec = await embed("test sentence for embedding");


const EXPECTED_DIM = vec.length; // auto-detect, don't hardcode
ok(`vector length: ${vec.length} (${vec.length === 768 ? "nomic-embed-text" : vec.length === 1024 ? "mxbai-embed-large" : "unknown model"})`);


const isRealFloat = !isNaN(vec[0]!) && vec[0] !== 0;
isRealFloat
  ? ok(`first value is a real float: ${vec[0]?.toFixed(6)}`)
  : fail(`first value looks wrong: ${vec[0]}`);

// round-trip test
const buf = Buffer.from(vec.buffer);
const restored = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
vec[0] === restored[0]
  ? ok("buffer round-trip matches")
  : fail(`buffer round-trip broken: ${vec[0]} !== ${restored[0]}`);

// ── 3. clear old data ─────────────────────────────────────────────────────────
section("3. Clean Slate");
const db0 = new Database(DB_PATH);
db0.run("DELETE FROM chunks");
db0.close();
ok("cleared chunks table");

// also delete old test .md files
try {
  const files = await readdir(join(VAULT_DIR, "Memory"));
  for (const f of files) {
    await Bun.file(join(VAULT_DIR, "Memory", f)).delete?.();
  }
} catch {}
ok("cleared Memory/ folder");

// ── 4. save memories ──────────────────────────────────────────────────────────
section("4. Save Memories");
const testMemories = [
  {
    content: "User prefers TypeScript over JavaScript for all projects",
    type: "preference" as const,
    tags: ["coding", "typescript"],
  },
  {
    content: "User is building GooGo, a terminal AI chat CLI tool using Bun runtime and Ollama for local LLM inference",
    type: "project" as const,
    tags: ["project", "cli", "bun", "googo"],
  },
  {
    content: "User prefers dark terminal UI themes for their development environment",
    type: "preference" as const,
    tags: ["ui", "terminal", "themes"],
  },
  {
    content: "User's name is Bhavesh and they are a developer",
    type: "person" as const,
    tags: ["personal", "name"],
  },
];

for (const mem of testMemories) {
  const id = await nextMemoryId();
  await saveMemory({ id, ...mem });
  ok(`saved ${id}: ${mem.content.slice(0, 45)}...`);
}

// ── 5. verify DB ──────────────────────────────────────────────────────────────
section("5. Verify SQLite chunks");
const db1 = new Database(DB_PATH);
const rows = db1.query(
  "SELECT id, file_path, chunk_index, length(embedding) as embLen, file_hash FROM chunks"
).all() as any[];
db1.close();

rows.length === 4
  ? ok(`${rows.length} chunks in DB (one per memory)`)
  : fail(`expected 4 chunks, got ${rows.length}`);

for (const row of rows) {
  const EXPECTED_BYTES = vec.length * 4; // 1024 * 4 = 4096 for mxbai
  const embOk = row.embLen === EXPECTED_BYTES;
  const hashOk = row.file_hash && row.file_hash !== "";
  const fileOk = row.file_path.endsWith(".md");

  embOk  ? ok(`${row.id}: embedding ${row.embLen} bytes`) : fail(`${row.id}: wrong embedding size ${row.embLen}`);
  hashOk ? ok(`${row.id}: file_hash present`)             : fail(`${row.id}: file_hash missing`);
  fileOk ? ok(`${row.id}: file_path has .md extension`)   : fail(`${row.id}: file_path missing .md — got ${row.file_path}`);
}

// ── 6. verify vault files ─────────────────────────────────────────────────────
section("6. Verify Vault Files");
const memFiles = await readdir(join(VAULT_DIR, "Memory"));

memFiles.length === 4
  ? ok(`${memFiles.length} .md files in Memory/`)
  : fail(`expected 4 files, got ${memFiles.length}: ${memFiles.join(", ")}`);

for (const f of memFiles) {
  const content = await Bun.file(join(VAULT_DIR, "Memory", f)).text();
  const hasFrontmatter = content.startsWith("---");
  const hasBody = content.replace(/^---[\s\S]*?---\n/, "").trim().length > 0;

  hasFrontmatter ? ok(`${f}: has YAML frontmatter`) : fail(`${f}: missing frontmatter`);
  hasBody        ? ok(`${f}: has body content`)     : fail(`${f}: empty body`);
}

// ── 7. semantic search ────────────────────────────────────────────────────────
section("7. Semantic Search");
const searches = [
  { query: "what coding language does the user prefer?",   expectWord: "TypeScript" },
  { query: "what project is the user working on?",         expectWord: "GooGo" },
  { query: "what is the user's name?",                     expectWord: "Bhavesh" },
];

for (const { query, expectWord } of searches) {
  const results = await searchMemories(query, 3, 0.5);

  console.log(`\n  all scores for "${query.slice(0, 35)}":`);
  results.forEach(r => console.log(`    ${r.score.toFixed(4)}  ${r.content.slice(0, 60)}`));

  const top = results[0];

  if (!top) {
    fail(`"${query.slice(0, 40)}" → no results`);
    continue;
  }

  const correct = top.content.includes(expectWord);
  correct
    ? ok(`"${query.slice(0, 40)}" → ${top.score.toFixed(3)} "${top.content.slice(0, 50)}..."`)
    : fail(`"${query.slice(0, 40)}" → expected "${expectWord}", got "${top.content.slice(0, 60)}"...`);
}

// ── 8. staleness + re-index ───────────────────────────────────────────────────
section("8. Staleness Detection (Obsidian edit simulation)");

// grab the first memory file
const firstFile = join(VAULT_DIR, "Memory", memFiles.sort()[0]!);
const originalContent = await Bun.file(firstFile).text();

// get its stored hash before edit
const db2 = new Database(DB_PATH);
const beforeRow = db2.query(
  "SELECT file_hash FROM chunks WHERE file_path = ? LIMIT 1"
).get(firstFile) as { file_hash: string } | null;
db2.close();

ok(`stored hash before edit: ${beforeRow?.file_hash?.slice(0, 16)}...`);

// simulate Obsidian edit — append new content to the file
const editedContent = originalContent + "\n\nUser also prefers Bun over Node.js\n";
await Bun.write(firstFile, editedContent);
ok("simulated Obsidian edit (appended new fact to file)");

// verify hash mismatch is detected
const currentHash = Bun.hash(editedContent).toString();
const mismatch = currentHash !== beforeRow?.file_hash;
mismatch
  ? ok("staleness detected — hashes differ after edit")
  : fail("staleness NOT detected — hashes still match after edit (bug!)");

// re-index the edited file
await indexFile(firstFile);
ok("re-indexed edited file");

// verify new hash is stored
const db3 = new Database(DB_PATH);
const afterRow = db3.query(
  "SELECT file_hash FROM chunks WHERE file_path = ? LIMIT 1"
).get(firstFile) as { file_hash: string } | null;
db3.close();

afterRow?.file_hash === currentHash
  ? ok(`hash updated in DB: ${afterRow?.file_hash?.slice(0, 16)}...`)
  : fail(`hash not updated — DB still has old hash`);

// search should now find the new content
const freshResults = await searchMemories("does user prefer Bun or Node?", 3, 0.4);
const foundNew = freshResults.some(r => r.content.includes("Bun"));
foundNew
  ? ok(`search finds newly indexed content "Bun over Node.js"`)
  : fail(`search did not find updated content — re-index may not be working`);

// restore original file
await Bun.write(firstFile, originalContent);
await indexFile(firstFile);
ok("restored original file + re-indexed");

// ── 9. extraction ─────────────────────────────────────────────────────────────
section("9. Memory Extraction");
const extracted = await extractedMemory(
  "I always write TypeScript without semicolons and I use 2 space indentation everywhere",
  "Got it, I will follow your coding style in all future suggestions",
  "qwen2.5-coder:3b"  // ← change to your actual model from `ollama list`
);

extracted.length > 0
  ? ok(`extracted ${extracted.length} memories:`)
  : fail("nothing extracted — check model name or extract.ts prompt");

for (const m of extracted) {
  console.log(`     [${m.type}] ${m.content}`);
  console.log(`      tags: ${m.tags.join(", ")}`);
}

// ── 10. index other vault folders ─────────────────────────────────────────────
section("10. Index People / Projects / Preferences");

// write a test file to People/ and index it
const bhaveshPath = join(VAULT_DIR, "People", "Bhavesh.md");
await Bun.write(bhaveshPath, `---
name: Bhavesh
type: person
---

Bhavesh is a developer who builds CLI tools.
He prefers TypeScript and Bun.
He is working on a project called GooGo.
`);
await indexFile(bhaveshPath);
ok("indexed People/Bhavesh.md");

// search should find it alongside Memory/ files
const peopleResults = await searchMemories("who is Bhavesh?", 3, 0.4);
const foundPeople = peopleResults.some(r => r.file_path.includes("People"));
foundPeople
  ? ok("search found results from People/ folder")
  : fail("search did not find People/ folder content");

// ── summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"━".repeat(44)}`);
console.log(`  ${passed} passed   ${failed} failed`);
console.log(`${"━".repeat(44)}\n`);

if (failed > 0) {
  console.log("Fix ✗ items above then rerun.\n");
  process.exit(1);
} else {
  console.log("All tests passed — memory system is ready.\n");
}
