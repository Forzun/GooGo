import { readdir } from "fs/promises";
import path from "node:path";

interface filterProps {
  filters: string[];
  value: string;
}

const COMMANDS = [
  { name: "/help", desc: "show this help" },
  { name: "/clear", desc: "clear conversation" },
  { name: "/model", desc: "show current model" },
  { name: "/pull", desc: "pull ollama model" },
  { name: "/history", desc: "all your history" },
  { name: "/quit", desc: "quit" },
];

export function filterCommand(input: string) {
  if (!input.startsWith("/")) {
    return [];
  }
  return COMMANDS.filter((word) => word.name.startsWith(input));
}

export function commandFilter({ filters, value }: filterProps) {
  const filterWords = filters.filter((word) =>
    word.toLocaleLowerCase().startsWith(value),
  );
  return filterWords;
}

export async function getFiles(
  dir: string = process.cwd(),
  files: string[] = [],
): Promise<string[]> {
  const entries = await readdir(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".git" ||
        entry.name === "dist"
      ) {
        continue;
      }

      await getFiles(fullPath, files);
    } else {
      files.push(path.relative(process.cwd(), fullPath));
    }
  }

  return files;
}

export function cleanResponse(text: string) {
  return text
    .replace(/^\s*\d+\.\s+\*\*(.*?)\*\*:?/gm, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/^Imports:\s*$/gm, "")
    .replace(/^Program Initialization:\s*$/gm, "")
    .replace(/^Welcome Message:\s*$/gm, "")
    .trim();
}

export function cleanCode(code: string) {
  return code
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

function sum(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Arrays must have the same length");
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === undefined || b[i] === undefined) {
      throw new Error(`Array index ${i} is undefined`);
    }
    result += a[i] + b[i];
  }
  return result;
}

Here is the new function:

```typescript
export function randomValueGenerator(): number {
  return Math.floor(Math.random() * 100);
}
