import { createHighlighter } from "shiki";

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
