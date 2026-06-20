import type { FoundFunction } from "./types";

export function findFunction(name: string, code: string): FoundFunction | null {
  const patterns = [
    `function ${name}`,

    `export function ${name}`,

    `async function ${name}`,

    `export async function ${name}`,
  ];

  let start = -1;

  for (const p of patterns) {
    start = code.indexOf(p);

    if (start === -1) {
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let findBraces = false;

  for (let i = start; i < code.length; i++) {
    const c = code[i];

    if (c === "{") {
      depth++;
      findBraces = true;
    }

    if (c === "}") {
      depth--;
      if (findBraces && depth === 0) {
        return {
          start,
          end: i + 1,
          source: code.slice(start, i + 1),
        };
      }
    }
  }
  return null;
}
