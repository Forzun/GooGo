import type { Message } from "ollama/dist/browser.cjs";
import { execSync } from "child_process";

// ── ANSI ──────────────────────────────────────────────────────────────────────
const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;
const bg = (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`;

const TEXT = fg(220, 218, 210);
const MUTED = fg(80, 78, 72);
const SUBTLE = fg(55, 53, 48);
const WARN = fg(192, 112, 64);
const OK = fg(106, 154, 106);
const HINT = fg(85, 120, 85);
const BORDER = fg(55, 53, 48); // box border color
const INPUT_BG = bg(28, 27, 24); // slightly lighter than terminal bg

const cols = () => process.stdout.columns ?? 80;
const w = (s: string) => process.stdout.write(s);

// ── Git branch ────────────────────────────────────────────────────────────────
function gitBranch(): string {
  try {
    return (
      execSync("git rev-parse --abbrev-ref HEAD 2>/dev/null", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || "main"
    );
  } catch {
    return "main";
  }
}

// ── Header (printed once) ─────────────────────────────────────────────────────
function printHeader(model: string, sandbox = false, quotaPct = 0) {
  const cwd = process.cwd().replace(process.env.HOME ?? "", "~");
  const branch = gitBranch();
  const C = cols();

  // top-right hint
  const hint = "? for shortcuts";
  w(" ".repeat(Math.max(0, C - hint.length - 1)) + MUTED + hint + R + "\n");

  // shift+tab hint
  w(HINT + "Shift+Tab to accept edits" + R + "\n");

  w("\n");

  // status labels
  const widths = [28, 10, 14, 26, 0];
  const labels = [
    "workspace (/directory)",
    "branch",
    "sandbox",
    "/model",
    "quota",
  ];
  w("  ");
  labels.forEach((l, i) => w(MUTED + l.padEnd(widths[i]) + R));
  w("\n");

  // status values
  const sandboxClr = sandbox ? OK : WARN;
  const sandboxStr = sandbox ? "sandbox" : "no sandbox";
  w("  ");
  w(TEXT + cwd.padEnd(widths[0]) + R);
  w(TEXT + branch.padEnd(widths[1]) + R);
  w(sandboxClr + sandboxStr.padEnd(widths[2]) + R);
  w(TEXT + model.padEnd(widths[3]) + R);
  w(OK + quotaPct + "% used" + R);
  w("\n");
}

// ── Output helpers ────────────────────────────────────────────────────────────
function printAI(content: string) {
  w("\n");
  content.split("\n").forEach((l) => w("  " + TEXT + l + R + "\n"));
  w("\n");
}

function printInfo(
  text: string,
  kind: "default" | "success" | "error" = "default",
) {
  const c = kind === "success" ? OK : kind === "error" ? WARN : MUTED;
  w("\n  " + c + text + R + "\n\n");
}

function printHelp() {
  const rows: [string, string][] = [
    ["/help", "show this help"],
    ["/clear", "clear conversation history"],
    ["/history", "show message history"],
    ["/model", "show current model"],
    ["/exit", "quit"],
  ];
  w("\n");
  rows.forEach(([cmd, desc]) =>
    w("  " + BOLD + TEXT + cmd.padEnd(12) + R + "  " + MUTED + desc + R + "\n"),
  );
  w("\n");
}

// ── Bordered input box ────────────────────────────────────────────────────────
//
//  ╭──────────────────────────────────────────────────────────────╮
//  │  > █                                                         │
//  ╰──────────────────────────────────────────────────────────────╯
//
// Strategy:
//   1. Draw all 3 lines once.
//   2. Move cursor UP 2 to sit on the middle line (col 1).
//   3. Every keypress: \r + rewrite middle line (no UP/DOWN ever again).
//   4. On Enter: move DOWN 2 to land below the box cleanly.

const CORNER_TL = "╭";
const CORNER_TR = "╮";
const CORNER_BL = "╰";
const CORNER_BR = "╯";
const HORIZ = "─";
const VERT = "│";

// The middle line content (no trailing newline)
// "  │  > VALUE<pad>  │"
// Visible prefix = "  │  > " = 7 chars
const MID_PREFIX_VIS = 7; // "  │  > "
const MID_SUFFIX_VIS = 3; // "  │"  (space+space+│ at end... actually "  │")

function midLine(value: string): string {
  const inner = cols() - 4; // between ╭ and ╮  (2 spaces indent each side)
  const maxVal = inner - MID_PREFIX_VIS - MID_SUFFIX_VIS + 2;
  const display = value.slice(-maxVal);
  const pad = Math.max(0, inner - MID_PREFIX_VIS - display.length - 2);

  return (
    "  " +
    BORDER +
    VERT +
    R +
    INPUT_BG +
    "  > " +
    TEXT +
    display +
    R +
    INPUT_BG +
    " ".repeat(pad) +
    R +
    BORDER +
    "  " +
    VERT +
    R
  );
}

function drawBox(value: string) {
  const inner = cols() - 4;
  const h = HORIZ.repeat(inner);
  w("  " + BORDER + CORNER_TL + h + CORNER_TR + R + "\n");
  w(midLine(value) + "\n");
  w("  " + BORDER + CORNER_BL + h + CORNER_BR + R + "\n");
}

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    let value = "";

    // Draw box — cursor ends up below bottom border line
    drawBox(value);

    // Go up 2 lines → land on middle line (col 1 implicitly via \r in redraws)
    w("\x1b[2A" + SHOW);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };

    // Redraw only the middle line in place
    const redraw = () => {
      w("\r\x1b[K" + midLine(value));
    };

    const onData = (key: string) => {
      if (key === "\r" || key === "\n") {
        // Move down 2 (past bottom border) then newline
        w("\x1b[2B\n" + HIDE);
        cleanup();
        resolve(value);
      } else if (key === "\x03") {
        w("\x1b[2B\n");
        cleanup();
        resolve("/exit");
      } else if (key === "\x7f" || key === "\b") {
        if (value.length === 0) return;
        value = value.slice(0, -1);
        redraw();
      } else if (key.charCodeAt(0) >= 32) {
        value += key;
        redraw();
      }
    };

    process.stdin.on("data", onData);
  });
}

// ── Main loop ─────────────────────────────────────────────────────────────────
export async function startChat(model: string) {
  const history: Message[] = [];

  w(HIDE);
  printHeader(model);
  w("\n");

  process.on("SIGINT", () => {
    w(SHOW + "\n");
    printInfo("Goodbye 👋", "success");
    process.exit(0);
  });

  while (true) {
    const raw = await readLine();
    const trimmed = raw.trim();
    if (!trimmed) {
      w("\n");
      continue;
    }

    if (trimmed === "/help" || trimmed === "?") {
      printHelp();
      continue;
    }

    if (trimmed === "/exit" || trimmed === "/quit") {
      printInfo("Goodbye 👋", "success");
      w(SHOW);
      break;
    }

    if (trimmed === "/clear") {
      history.length = 0;
      printInfo("✓  Conversation cleared.", "success");
      continue;
    }

    if (trimmed === "/history") {
      if (!history.length) {
        printInfo("No history yet.");
      } else {
        w("\n");
        history.forEach((m, i) => {
          const lbl = m.role === "user" ? OK + "you" + R : TEXT + "ai" + R;
          const preview =
            m.content.slice(0, 72) + (m.content.length > 72 ? "…" : "");
          w(
            "  " +
              MUTED +
              String(i + 1).padStart(2) +
              ". " +
              R +
              lbl +
              "  " +
              MUTED +
              preview +
              R +
              "\n",
          );
        });
        w("\n");
      }
      continue;
    }

    if (trimmed === "/model") {
      printInfo(`Model: ${model}`);
      continue;
    }

    if (trimmed.startsWith("/")) {
      printInfo(`Unknown command: ${trimmed}  ·  try /help`, "error");
      continue;
    }

    history.push({ role: "user", content: trimmed });
    printAI("Echo: " + trimmed);
    history.push({ role: "assistant", content: "Echo: " + trimmed });
  }
}
