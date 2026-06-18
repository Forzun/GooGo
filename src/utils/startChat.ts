import { execSync } from "child_process";
import { chatResponseStream } from "../ollama/chat";
import { GooLoader } from "../loaders/progress";
import { pullModel } from "../ollama/pull-models";
import { input, search } from "@inquirer/prompts";
import { clearHistory, loadHistory, saveHistory } from "./history";
import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from "shiki";
import { hexToAnsi } from "./Color";
import { filterCommand, getFiles } from "./filter";
import {
  customTrimmed,
  getCurrentFileMention,
  searchFile,
} from "../tools/read-file";

let currentLoader: GooLoader | null = null;
const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const HIDE = "\x2b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR_SCREEN = "\x1b[2J\x1b[H";

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;
const bg = (r: number, g: number, b: number) => `\x1b[48;2;${r};${g};${b}m`;

const SUGG_CMD = "\x1b[38;2;70;70;78m"; // dim purple-gray for command
const SUGG_DESC = "\x1b[38;2;55;55;62m"; // even dimmer for description
const TEXT = fg(228, 228, 231);
const MUTED = fg(161, 161, 171);
const DIM = fg(113, 113, 122);
const WARN = fg(251, 146, 60);
const OK = fg(134, 239, 172);
const HINT = fg(74, 222, 128);
const BOX_BG = bg(52, 52, 58);

const THEME_COLORS: Record<string, string> = {
  zinc: fg(212, 212, 216),
  green: fg(134, 239, 172),
  amber: fg(252, 211, 77),
  cyan: fg(103, 232, 249),
};

const cols = () => process.stdout.columns ?? 80;
const w = (s: string) => process.stdout.write(s);

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

interface UIState {
  model: string;
  theme: string;
  sandbox: boolean;
  quotaPct: number;
  messages: { role: "user" | "assistant"; content: string }[];
}

let highlighter: Highlighter | null = null;

export async function initHighlighter() {
  highlighter = await createHighlighter({
    themes: ["gruvbox-dark-hard"],
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
      "tsx",
      "jsx",
    ],
  });
}

function parseContent(
  content: string,
): { type: "text" | "code"; lang?: string; value: string }[] {
  const parts: ReturnType<typeof parseContent> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: "code",
      lang: match[1] || "text",
      value: match[2]!.trim(),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "text", value: content }];
}

function renderMessage(content: string): string {
  if (!highlighter) return content;

  const parts = parseContent(content);
  let output = "";

  for (const part of parts) {
    if (part.type === "text") {
      output += part.value;
    } else {
      try {
        const tokens = highlighter.codeToTokensBase(part.value, {
          lang: part.lang! as BundledLanguage,
          theme: "gruvbox-dark-hard",
        });
        console.log("highlighter", !!highlighter);
        console.log(parseContent(content));
        for (const line of tokens) {
          for (const token of line) {
            output += hexToAnsi(token.color ?? "#ffffff") + token.content;
          }

          output += "\x1b[0m\n";
        }
      } catch {
        output += part.value;
      }
    }
  }

  return output;
}

function repaint(state: UIState) {
  const { model, theme, sandbox, quotaPct, messages } = state;
  const cwd = process.cwd().replace(process.env.HOME ?? "", "~");
  const branch = gitBranch();
  const C = cols();
  const accent = THEME_COLORS[theme] ?? MUTED;

  w(CLEAR_SCREEN);

  // top-right hint
  const hint = "? for shortcuts";
  w(" ".repeat(Math.max(0, C - hint.length - 1)) + DIM + hint + R + "\n");

  // shift+tab
  w(HINT + "Shift+Tab to accept edits" + R + "\n");

  if (messages.length > 0) {
    w("\n");
    messages.slice(-30).forEach((m) => {
      if (m.role === "user") {
        w(MUTED + " you  " + R + TEXT + m.content + R + "\n");
      } else {
        w("\n");
        const rendered = renderMessage(m.content);
        rendered.split("\n").forEach((l) => w(" " + TEXT + l + R + "\n"));
        w("\n");
      }
    });
  }

  w("\n");

  // status labels
  const widths = [28, 10, 14, 26, 0];
  ["workspace (/directory)", "branch", "sandbox", "/model", "quota"].forEach(
    (l, i) => w(DIM + l.padEnd(widths[i]!) + R),
  );
  w("\n");

  // status values
  w(TEXT + cwd.padEnd(widths[0]!) + R);
  w(TEXT + branch.padEnd(widths[1]!) + R);
  w(
    (sandbox ? OK : WARN) +
      (sandbox ? "sandbox" : "no sandbox").padEnd(widths[2]!) +
      R,
  );
  w(TEXT + model.padEnd(widths[3]!) + R);
  w(OK + quotaPct + "% used" + R);
  w("\n");

  w("\n");

  const placeholder = "Type your message or @path/to/file";
  const padR = Math.max(0, C - 4 - placeholder.length - 2);
  const blankRow = BOX_BG + " ".repeat(C) + R + "\n";
  const inputRow =
    BOX_BG +
    "  " +
    accent +
    "› " +
    DIM +
    placeholder +
    " ".repeat(padR) +
    "  " +
    R +
    "\n";
  w(blankRow);
  w(inputRow);
  w(blankRow);
}

function midLine(value: string, theme: string): string {
  const C = cols();
  const accent = THEME_COLORS[theme] ?? MUTED;
  const maxVal = C - 4 - 2;
  const display = value.slice(-maxVal);
  const pad = Math.max(0, C - 4 - display.length - 2);
  const PHOLDER = "Type your message or @path/to/file";
  const PLACEHOLDER_FG = "\x1b[38;2;82;82;91m";
  const body =
    display.length > 0
      ? TEXT + display + R
      : PLACEHOLDER_FG + PHOLDER.slice(0, maxVal) + R;
  const visLen =
    display.length > 0 ? display.length : Math.min(PHOLDER.length, maxVal);
  const padDyn = Math.max(0, C - 4 - visLen - 2);
  return (
    BOX_BG +
    "  " +
    accent +
    "› " +
    body +
    BOX_BG +
    " ".repeat(padDyn) +
    "  " +
    R
  );
}

function setCursor(value: string) {
  const maxVal = cols() - 6;
  const visLen = Math.min(value.length, maxVal);
  w(`\x1b[${visLen + 5}G`);
}

function readLine(theme: string): Promise<string> {
  return new Promise((resolve) => {
    let value = "";
    let prevSuggCount = 0;
    let selectedIndex = 0;
    let suggestions: string[] | null = [];
    let cmdSuggestions: { name: string; desc: string }[] = [];

    let projectFiles: string[] = [];
    let filesLoaded: boolean = false;

    async function ensureFileLoaded() {
      if (!filesLoaded) {
        projectFiles = await getFiles();
        filesLoaded = true;
      }
    }

    w("\x1b[2A");
    w("\r\x1b[K" + midLine(value, theme));
    setCursor(value);
    w(SHOW);

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };

    const clearSuggestions = () => {
      if (prevSuggCount === 0) return;
      w("\x1b[1B");
      for (let i = 0; i < prevSuggCount; i++) {
        w("\r\x1b[K\n");
      }
      w(`\x1b[${prevSuggCount + 1}A`);
      prevSuggCount = 0;
    };

    const renderSuggestions = () => {
      clearSuggestions();

      const mention = getCurrentFileMention(value);

      if (mention) {
        suggestions = searchFile(mention, projectFiles);
        cmdSuggestions = [];

        if (suggestions!.length > 0) {
          w("\x1b[1B");
          suggestions!.forEach((file, index) => {
            const prefix = index === selectedIndex ? "› " : "  ";
            const color = index === selectedIndex ? TEXT : SUGG_CMD;
            w("\r\x1b[K" + prefix + color + file + R + "\n");
          });
          w(`\x1b[${suggestions!.length + 1}A`);
          prevSuggCount = suggestions!.length;
        }
      } else {
        suggestions = [];
        cmdSuggestions = filterCommand(value);

        if (cmdSuggestions.length > 0) {
          w("\x1b[1B");
          cmdSuggestions.forEach((cmd) => {
            w(
              "\r\x1b[K  " +
                SUGG_CMD +
                cmd.name.padEnd(12) +
                SUGG_DESC +
                cmd.desc +
                R +
                "\n",
            );
          });
          w(`\x1b[${cmdSuggestions.length + 1}A`);
          prevSuggCount = cmdSuggestions.length;
        }
      }
    };

    const redraw = () => {
      w("\r\x1b[K" + midLine(value, theme));
      renderSuggestions();
      setCursor(value);
    };

    ensureFileLoaded();

    const onData = async (key: string) => {
      if (key === "\x1b[A") {
        if (suggestions!.length > 0) {
          selectedIndex = Math.max(0, selectedIndex - 1);
          redraw();
        }
        return;
      }

      if (key === "\x1b[B") {
        if (suggestions!.length > 0) {
          selectedIndex = Math.min(suggestions!.length - 1, selectedIndex + 1);
          redraw();
        }
        return;
      }

      if (key === "\r" || key === "\n") {
        clearSuggestions();
        w("\x1b[2B" + HIDE);
        cleanup();
        resolve(value);
        return;
      }

      if (key === "\x03") {
        clearSuggestions();
        w("\x1b[2B");
        cleanup();
        resolve("/exit");
        return;
      }

      if (key === "\x7f" || key === "\b") {
        if (value.length === 0) return;
        value = value.slice(0, -1);
        selectedIndex = 0;
        redraw();
        return;
      }

      if (key === "\t") {
        if (suggestions!.length > 0) {
          const selected = suggestions![selectedIndex];
          value = value.replace(/@([^\s]*)$/, `@${selected}`);
          selectedIndex = 0;
        } else if (cmdSuggestions.length === 1) {
          value = cmdSuggestions[0]!.name + " ";
        }
        redraw();
        return;
      }

      if (key === "@") {
        value += key;
        await ensureFileLoaded();
        selectedIndex = 0;
        redraw();
        return;
      }

      if (key.charCodeAt(0) >= 32) {
        value += key;
        selectedIndex = 0;
        redraw();
        return;
      }
    };

    process.stdin.on("data", onData);
  });
}

export async function startChat(model: string, theme = "zinc") {
  const state: UIState = {
    model,
    theme,
    sandbox: false,
    quotaPct: 0,
    messages: [],
  };

  w(HIDE);
  repaint(state);

  process.on("SIGINT", () => {
    w(SHOW + "\n");
    process.exit(0);
  });

  while (true) {
    const raw = await readLine(theme);
    const trimmed = raw.trim();

    if (!trimmed) {
      repaint(state);
      continue;
    }

    function stopLoader() {
      if (currentLoader) {
        currentLoader.stop();
        currentLoader = null;
      }
    }

    function startLoader(label: string) {
      stopLoader();
      currentLoader = new GooLoader("green").start();
      currentLoader.setLabel(label);
      return currentLoader;
    }

    if (trimmed === "/help" || trimmed === "?") {
      state.messages.push({
        role: "assistant",
        content:
          "/help      show this help\n/clear     clear conversation\n/model     show current model\n/pull      pull ollama model\n/history   all your history\n/quit      quit",
      });
      repaint(state);
      continue;
    }

    if (trimmed === "/history") {
      const history = await loadHistory();
      const last10 = history.slice(-10);
      process.stdout.write("not yet!");
      repaint(state);
      continue;
    }

    if (trimmed === "/pull") {
      stopLoader();
      w(SHOW);
      const modelName = await input({
        message: "Enter model name",
      });

      w(HIDE);
      startLoader(`pulling ${modelName}`);
      try {
        await pullModel({
          model: modelName,
          onProgress: (progress) => {
            if (progress.total && progress.completed) {
              const pct = Math.round(
                (progress.completed / progress.total) * 100,
              );
              currentLoader?.setLabel(`pulling ${modelName} ${pct}%`);
            } else {
              currentLoader?.setLabel(progress.status);
            }
          },
        });
        stopLoader();
        state.messages.push({
          role: "assistant",
          content: `✅ ${modelName} pulled successfully /mode to see`,
        });
      } catch (error) {
        stopLoader();
        state.messages.push({
          role: "assistant",
          content: `❌ Failed to pull ${modelName}`,
        });
      }
      repaint(state);
      continue;
    }

    if (trimmed === "/exit" || trimmed === "/quit") {
      w(CLEAR_SCREEN + SHOW);
      break;
    }
    if (trimmed === "/clear") {
      state.messages = [];
      clearHistory();
      repaint(state);
      continue;
    }

    if (trimmed === "/model") {
      state.messages.push({ role: "assistant", content: `Model: ${model}` });
      repaint(state);
      continue;
    }

    if (trimmed.startsWith("/")) {
      state.messages.push({
        role: "assistant",
        content: `Unknown: ${trimmed}  ·  try /help`,
      });
      repaint(state);
      continue;
    }

    const trimmedPrompt = await customTrimmed(trimmed);

    state.messages.push({ role: "user", content: trimmed });
    repaint(state);

    state.messages.push({ role: "assistant", content: "" });

    let assistantContent = "";

    try {
      const stream = await chatResponseStream({
        messages: state.messages.slice(0, -1),
        model: state.model,
      });

      for await (const token of stream) {
        assistantContent += token;
        state.messages[state.messages.length - 1] = {
          role: "assistant",
          content: assistantContent,
        };

        process.stdout.write(token);
      }

      console.log("\n");
      repaint(state);
    } catch (error) {
      state.messages[state.messages.length - 1]!.content =
        "❌ Error: " + (error instanceof Error ? error.message : String(error));
      repaint(state);
    }

    await saveHistory(state.messages);
  }
}

async function downloadModel(modelName: string, color: string) {
  const loader = new GooLoader("amber");
  loader.setLabel(`pulling ${modelName}`);

  try {
    await pullModel({
      model: modelName,
      onProgress: (progress) => {
        if (progress.total && progress.completed) {
          const percent = Math.round(
            (progress.completed / progress.total) * 100,
          );
          loader.setLabel(`pulling ${modelName} ${percent}%`);
        } else {
          loader.setLabel(progress.status);
        }
      },
    });

    loader.stop(`${modelName} ready`);
  } catch (error) {
    console.log(error);
  }
}
