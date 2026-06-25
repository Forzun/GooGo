import { createHighlighter } from "shiki";
import type { BundledLanguage } from "shiki/bundle/web";
import { hexToAnsi } from "../utils/Color";
import { diffLines } from "diff";

let highlighter: Awaited<ReturnType<typeof createHighlighter>>;

function highlightCode(code: string, lang = "text") {
  if (!highlighter) return code;

  try {
    return highlighter.codeToHtml(code, {
      lang,
      theme: "github-dark",
    });
  } catch {
    return code;
  }
}
//
export async function initHighlighter() {
  highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: [
      "typescript",
      "javascript",
      "python",
      "bash",
      "json",
      "html",
      "css",
      "markdown",
      "rust",
      "go",
    ],
  });
}

// Detect code blocks in markdown
function parseContent(
  content: string,
): { type: "text" | "code"; lang?: string; value: string }[] {
  const parts: ReturnType<typeof parseContent> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    // Code block
    parts.push({
      type: "code",
      lang: match[1] || "text",
      value: match[2]!.trim(),
    });

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      value: content.slice(lastIndex),
    });
  }

  return parts.length ? parts : [{ type: "text", value: content }];
}

// Use in your repaint function
export function renderMessage(content: string): string {
  const parts = parseContent(content);
  let output = "";

  for (const part of parts) {
    if (part.type === "text") {
      output += part.value;
    } else {
      output += highlightCode(part.value, part.lang);
    }
  }

  return output;
}

const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const RED_BG = "\x1b[48;2;50;20;20m";
const RED_FG = "\x1b[38;2;255;120;120m";
const GREEN_BG = "\x1b[48;2;20;45;25m";
const GREEN_FG = "\x1b[38;2;120;220;130m";
const MUTED = "\x1b[38;2;110;108;100m";
const WHITE = "\x1b[38;2;220;218;210m";
const BLUE = "\x1b[38;2;100;160;255m";

function highlightLine(line: string, lang: string): string {
  if (!highlighter || line.trim() === "") return WHITE + line + R;

  try {
    const tokens = highlighter.codeToTokensBase(line, {
      lang: lang as BundledLanguage,
      theme: "gruvbox-dark-hard",
    });

    let out = "";
    for (const tokenLine of tokens) {
      for (const token of tokenLine) {
        out += hexToAnsi(token.color ?? "#ebdbb2") + token.content;
      }
    }
    return out + R;
  } catch {
    return WHITE + line + R;
  }
}

function detectLang(path: string): string {
  const ext = path.split(".").pop() ?? "ts";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    sh: "bash",
    json: "json",
    md: "markdown",
    rs: "rust",
    go: "go",
    html: "html",
    css: "css",
  };
  return map[ext] ?? "typescript";
}

/**
 * Renders a diff with REAL syntax highlighting via shiki, Claude Code style:
 *
 *   ✓ Edited utils/filter.ts  (sum)
 *
 *     1  function sum(a, b) {
 *   - 2    return 5;          ← syntax highlighted, red bg tint
 *   + 2    return 500;        ← syntax highlighted, green bg tint
 *     3  }
 */

export async function renderDiff(opts: {
  path: string;
  oldCode: string | null;
  newCode: string;
  functionName?: string;
}): Promise<string> {
  await initHighlighter();

  const { path, oldCode, newCode, functionName } = opts;
  const isNew = !oldCode;
  const lang = detectLang(path);

  let out = "\n";

  // ── header ───────────────────────────────────────────────────────────────
  const icon = isNew ? `${GREEN_FG}+${R}` : `${BLUE}✓${R}`;
  const label = isNew ? "Created" : "Edited";
  out += `  ${icon} ${BOLD}${WHITE}${label}${R} ${MUTED}${path}${R}`;
  if (functionName) out += `  ${DIM}${MUTED}(${functionName})${R}`;
  out += "\n\n";

  // ── new file/function — all green, highlighted ─────────────────────────
  if (isNew) {
    const lines = newCode.split("\n");
    lines.forEach((line, i) => {
      const lineNo = String(i + 1).padStart(3, " ");
      const highlighted = highlightLine(line, lang);
      out += `  ${GREEN_FG}+${R} ${MUTED}${lineNo}${R}  ${GREEN_BG}${highlighted}${R}\n`;
    });
    out += "\n";
    process.stdout.write(out);
    return out;
  }

  // ── edited — real diff, each changed line syntax highlighted ────────────
  const changes = diffLines(oldCode!, newCode);

  let oldLineNo = 1;
  let newLineNo = 1;

  for (const part of changes) {
    const rawLines = part.value.split("\n");
    // drop trailing empty line caused by split when value ends in \n
    const lines = part.value.endsWith("\n") ? rawLines.slice(0, -1) : rawLines;

    if (part.added) {
      lines.forEach((line) => {
        const lineNo = String(newLineNo).padStart(3, " ");
        const highlighted = highlightLine(line, lang);
        out += `  ${GREEN_FG}+${R} ${MUTED}${lineNo}${R}  ${GREEN_BG}${highlighted}${R}\n`;
        newLineNo++;
      });
    } else if (part.removed) {
      lines.forEach((line) => {
        const lineNo = String(oldLineNo).padStart(3, " ");
        const highlighted = highlightLine(line, lang);
        out += `  ${RED_FG}-${R} ${MUTED}${lineNo}${R}  ${RED_BG}${highlighted}${R}\n`;
        oldLineNo++;
      });
    } else {
      // unchanged context — dim, still highlighted but muted
      lines.forEach((line) => {
        const lineNo = String(newLineNo).padStart(3, " ");
        out += `    ${MUTED}${lineNo}${R}  ${DIM}${WHITE}${line}${R}\n`;
        oldLineNo++;
        newLineNo++;
      });
    }
  }

  out += "\n";
  // process.stdout.write(out);
  return out;
}
