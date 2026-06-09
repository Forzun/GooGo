import type { Message } from "ollama/dist/browser.cjs";

const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const WHITE = "\x1b[38;2;220;218;210m";
const MUTED = "\x1b[38;2;90;88;80m";
const GREEN = "\x1b[38;2;63;185;80m";
const BLUE = "\x1b[38;2;100;160;255m";
const RED = "\x1b[38;2;220;80;80m";
const YELLOW = "\x1b[38;2;200;160;60m";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLR = "\x1b[2K\r";
const UP = (n: number) => `\x1b[${n}A`;
const COL = (n: number) => `\x1b[${n}G`;

function cols() {
  return process.stdout.columns ?? 80;
}
function rows() {
  return process.stdout.rows ?? 24;
}

// ── full-width divider ────────────────────────────────────────────────────────
function divider() {
  return `${MUTED}${"─".repeat(cols())}${R}`;
}

// ── header (top 3 lines, like gemini) ────────────────────────────────────────
function printHeader(model: string) {
  const hint = `${MUTED}? for shortcuts${R}`;
  const hintLen = "? for shortcuts".length;
  const pad = cols() - hintLen - 1;
  process.stdout.write("\n");
  process.stdout.write(" ".repeat(pad) + hint + "\n");
  process.stdout.write("\n");
  process.stdout.write(`  ${MUTED}Shift+Tab to accept edits${R}\n`);
  process.stdout.write("\n");
}

// ── AI response ───────────────────────────────────────────────────────────────
function printAI(content: string) {
  process.stdout.write("\n");
  content.split("\n").forEach((l) => {
    process.stdout.write(`  ${WHITE}${l}${R}\n`);
  });
  process.stdout.write("\n");
}

function printInfo(text: string) {
  process.stdout.write(`\n  ${MUTED}${text}${R}\n\n`);
}

function printHelp() {
  const cmds = [
    ["/clear", "clear conversation history"],
    ["/history", "show message history"],
    ["/model", "show current model"],
    ["/exit", "quit"],
  ];
  process.stdout.write("\n");
  cmds.forEach(([cmd, desc]) => {
    process.stdout.write(
      `  ${GREEN}${cmd.padEnd(12)}${R}${MUTED}${desc}${R}\n`,
    );
  });
  process.stdout.write("\n");
}

// ── bottom status bar (gemini style) ─────────────────────────────────────────
// workspace (/directory)   branch   sandbox   /model        quota
function drawStatusBar(model: string, cwd: string, branch = "main") {
  const width = cols();
  const wspace = cwd.replace(process.env.HOME ?? "", "~");
  const sandbox = `${RED}no sandbox${R}`;
  const sandboxLen = "no sandbox".length;
  const modelStr = `${MUTED}/${model}${R}`;
  const modelLen = model.length + 1;
  const quota = `${GREEN}0% used${R}`;
  const quotaLen = "0% used".length;

  // row 1: column headers
  const h1 = `workspace (/directory)`;
  const h2 = `branch`;
  const h3 = `sandbox`;
  const h4 = `/model`;
  const h5 = `quota`;

  const c1 = 0,
    c2 = 24,
    c3 = 32,
    c4 = 42,
    c5 = width - quotaLen - 2;

  let headerRow = "";
  headerRow += " ".repeat(2) + `${MUTED}${h1}${R}`;
  headerRow += " ".repeat(c2 - 2 - h1.length) + `${MUTED}${h2}${R}`;
  headerRow += " ".repeat(c3 - c2 - h2.length) + `${MUTED}${h3}${R}`;
  headerRow += " ".repeat(c4 - c3 - h3.length) + `${MUTED}${h4}${R}`;
  const afterH4 = c4 + h4.length;
  headerRow += " ".repeat(Math.max(1, c5 - afterH4)) + `${MUTED}${h5}${R}`;

  // row 2: values
  const v1 = wspace;
  const v2 = "main";
  const v3len = sandboxLen;

  let valRow = "";
  valRow += " ".repeat(2) + `${WHITE}${v1}${R}`;
  valRow += " ".repeat(Math.max(1, c2 - 2 - v1.length)) + `${WHITE}${v2}${R}`;
  valRow += " ".repeat(Math.max(1, c3 - c2 - v2.length)) + sandbox;
  valRow += " ".repeat(Math.max(1, c4 - c3 - v3len)) + modelStr;
  const afterV4 = c4 + modelLen;
  valRow += " ".repeat(Math.max(1, c5 - afterV4)) + quota;

  process.stdout.write(divider() + "\n");
  process.stdout.write(headerRow + "\n");
  process.stdout.write(valRow + "\n");
}

// ── input bar (gemini style: "> " prompt, placeholder, no box) ───────────────
// Renders 2 lines:
//   (blank line)
//   > |Type your message or @path/to/file
// We draw it, then move cursor back to the › position for raw typing.

const PLACEHOLDER = "Type your message or @path/to/file";

function drawInputBar(value: string) {
  const placeholder =
    value.length === 0 ? `${MUTED}${PLACEHOLDER}${R}` : `${WHITE}${value}${R}`;
  process.stdout.write(`\n`);
  process.stdout.write(`  ${GREEN}${BOLD}>${R} ${placeholder}\n`);
}

function redrawInputLine(value: string) {
  // clear current line and redraw
  process.stdout.write(CLR);
  const placeholder =
    value.length === 0 ? `${MUTED}${PLACEHOLDER}${R}` : `${WHITE}${value}${R}`;
  process.stdout.write(`  ${GREEN}${BOLD}>${R} ${placeholder}`);
  // reposition cursor after "> " + value
  const cursorPos = 5 + value.length; // "  > " = 4 + 1 space
  process.stdout.write(COL(cursorPos + 1));
}

// ── raw input reader ──────────────────────────────────────────────────────────
function readInput(): Promise<string> {
  return new Promise((resolve) => {
    let value = "";

    // draw the input bar
    drawInputBar(value);
    // cursor is now on the input line, after placeholder
    // move cursor to after "> "
    process.stdout.write(UP(1));
    process.stdout.write(COL(6));
    process.stdout.write(SHOW);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const onData = (key: string) => {
      if (key === "\r" || key === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        process.stdout.write(HIDE);
        resolve(value);
        return;
      }
      if (key === "\x03") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve("/exit");
        return;
      }
      if (key === "\x7f" || key === "\b") {
        value = value.slice(0, -1);
      } else if (key.charCodeAt(0) >= 32) {
        value += key;
      }
      redrawInputLine(value);
    };

    process.stdin.on("data", onData);
  });
}

// ── main ──────────────────────────────────────────────────────────────────────
export async function startChat(model: string) {
  const history: Message[] = [];
  const cwd = process.cwd();

  process.stdout.write(HIDE);
  printHeader(model);

  process.on("SIGINT", () => {
    process.stdout.write(SHOW + "\n");
    process.exit(0);
  });

  while (true) {
    // draw status bar above input on each loop
    drawStatusBar(model, cwd);

    const userInput = await readInput();
    const trimmed = userInput.trim();
    if (!trimmed) continue;

    if (trimmed === "?" || trimmed === "/help") {
      printHelp();
      continue;
    }

    if (trimmed === "/exit" || trimmed === "/quit") {
      process.stdout.write(SHOW + "\n");
      break;
    }

    if (trimmed === "/clear") {
      history.length = 0;
      printInfo("✓  Conversation cleared.");
      continue;
    }

    if (trimmed === "/history") {
      if (!history.length) {
        printInfo("No history yet.");
      } else {
        process.stdout.write("\n");
        history.forEach((m, i) => {
          const label = m.role === "user" ? `${GREEN}you${R}` : `${BLUE}ai${R}`;
          const preview =
            m.content.slice(0, 72) + (m.content.length > 72 ? "…" : "");
          process.stdout.write(
            `  ${MUTED}${String(i + 1).padStart(2)}.${R} ${label}  ${MUTED}${preview}${R}\n`,
          );
        });
        process.stdout.write("\n");
      }
      continue;
    }

    if (trimmed === "/model") {
      printInfo(`Model: ${model}`);
      continue;
    }

    history.push({ role: "user", content: trimmed });

    // ── replace with real ollama streaming call ───────────────────────────
    printAI("Echo: " + trimmed);
    history.push({ role: "assistant", content: "Echo: " + trimmed });
  }
}
