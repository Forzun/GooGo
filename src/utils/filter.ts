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

export function randomValueGenerator(): number {
  return Math.floor(Math.random() * 100);
}

export function filterByValue(filters: string[], value: string): string[] {
  return filters.filter((word) =>
    word.toLocaleLowerCase().includes(value.toLowerCase()),
  );
}

export function filterWithValue(filters: string[], value: string): string[] {
  return filters.filter((word) =>
    word.toLocaleLowerCase().includes(value.toLowerCase()),
  );
}

export function isOddEven(num: number): string {
  if (num % 2 === 0) {
    return "even";
  } else {
    return "odd";
  }
}

export function loadingAnimation(): boolean {
  const startTime = performance.now();
  for (let i = 0; i < 20; i++) {
    process.stdout.write("\rLoading...");
  }
  console.log("\nDone!");
  return true;
}

export function loaderFunction(): string[] {
  const startTime = performance.now();
  const loadingTexts: string[] = [];
  for (let i = 0; i < 20; i++) {
    const text = "\rLoading...";
    process.stdout.write(text);
    loadingTexts.push(text);
  }
  console.log(`\nDone! (Loaded in ${performance.now() - startTime}ms)`);
  return loadingTexts;
}

export function countTwoNumbers(a: number, b: number): number {
  return a + b;
}
