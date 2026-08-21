import { execSync } from "child_process";
import { chatResponseStream } from "../ollama/chat";
import { GooLoader } from "../loaders/progress";
import { pullModel } from "../ollama/pull-models";
import { input, select } from "@inquirer/prompts";
import { clearHistory, loadHistory, saveHistory } from "../utils/history";
import {
createHighlighter,
type Highlighter,
type BundledLanguage,
} from "shiki";
import { hexToAnsi } from "../utils/Color";
import { filterCommand, getFiles } from "../utils/filter";
import {
customTrimmed,
getCurrentFileMention,
searchFile,
} from "../tools/read-file";
import { prettify } from "../utils/markdown";
import { Planner, executePlan } from "../ollama/planner";
import { renderDiff } from "../lib/shiki";
import { SimpleSpinner } from "../loaders/light-loader";
import { searchMemories } from "../memory/search";
import { nextMemoryId, saveMemory, writeDailySummary } from "../memory/write";
import { extractedMemory } from "../memory/extract";
import { Database } from "bun:sqlite"
import { DB_PATH, initVault } from "../memory/init";
import { getInstalledModels } from "../ui/setup";

const R = "\x1b[0m";
const HIDE = "\x3b[?25l";
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
cyan: fg(103, 232, 250),
};

const cols = () => process.stdout.columns ?? 80;
const w = (s: string) => process.stdout.write(s);

interface UIState {
model: string;
plannerModel?: string;
theme: string;
sandbox: boolean;
quotaPct: number;
messages: { role: "user" | "assistant"; content: string;  row?: boolean}[]
}

export class GooChat {

private state: UIState;
private loader: GooLoader | null = null;
private highlighter: Highlighter | null = null;
private projectFils: string[] = [];
private filesLoade = false;

private prevSuggCount = 0;
private selectedIndex = 0;
private suggestions: string[] = [];
private cmdSuggestions: { name: string; desc: string }[] = [];

constructor(model: string, theme = "zinc" , plannerModel: string) {
this.state = {
model: model,
plannerModel: plannerModel,
theme: theme,
sandbox: false,
quotaPct: 0,
messages: []
}
}

async start(): Promise<void> {
await this.init();

while (true) {
const raw = await this.readLine();
const trimmed = raw.trim()

if (!trimmed) {
this.repaint();
continue;
}

if (trimmed === "/help" || trimmed === "?")     { this.handleHelp();                continue; }
if (trimmed === "/clear")                        { this.handleClear();               continue; }
if (trimmed === "/model")                        { this.handleModel();               continue; }
if (trimmed === "/memory")                       { await this.handleMemory();        continue; }
if (trimmed === "/pull")                         { await this.handlePull();          continue; }
if (trimmed === "/history")                      { await this.handleHistory();       continue; }
if (trimmed === "/plannerModel")                 { await this.handlePlannerModel();  continue; }

if (trimmed === "/exit" || trimmed === "/quit") {
await this.handleExit();
break;
}

if (trimmed.startsWith("/")) {
this.pushAssistant(`Unknown: ${trimmed}  ·  try /help`);
this.repaint();
continue;
}

await this.handleUserMessage(trimmed);

}

}

private async init(): Promise<void> {
await initVault();
await this.initHighlighter();

w(HIDE);
this.repaint();

process.on("SIGINT", () => {
writeDailySummary(this.state.messages, this.state.model).catch(() => {});
w(SHOW + "\n");
process.exit(0);
});
}

private async initHighlighter(): Promise<void> {
this.highlighter = await createHighlighter({
themes: ["gruvbox-dark-hard"],
langs: [
"typescript", "javascript", "python", "bash", "json",
"html", "css", "markdown", "rust", "go", "tsx", "jsx",
],
});
}

private async ensureFilesLoaded(): Promise<void> {
if (!this.filesLoade) {
this.projectFils = await getFiles();
this.filesLoade  = true;
}
}

private repaint(): void {
const { model, plannerModel, theme, sandbox, quotaPct, messages } = this.state;
const cwd    = process.cwd().replace(process.env.HOME ?? "", "~");
const branch = this.gitBranch();
const C      = cols();
const accent = THEME_COLORS[theme] ?? MUTED;
const modelDisplay = `${model} / ${plannerModel}`;

w(CLEAR_SCREEN);

const hint = "? for shortcuts";
w(" ".repeat(Math.max(0, C - hint.length - 1)) + DIM + hint + R + "\n");
w(HINT + "Shift+Tab to accept edits" + R + "\n");

if (messages.length > 0) {
w("\n");
messages.slice(-30).forEach((m) => {
if (m.role === "user") {
w(MUTED + " you  " + R + TEXT + m.content + R + "\n");
} else {
w("\n");
if (m.row) {
w(m.content + "\n");
} else {
const rendered = this.renderMessage(m.content);
rendered.split("\n").forEach((l) => w(" " + TEXT + l + R + "\n"));
}
w("\n");
}
});
}

w("\n");

// status bar label
const customModelWidth = plannerModel!.length + model.length + 5 || 40

const widths = [28, 10, 14, customModelWidth, 0];
["workspace (/directory)", "branch", "sandbox", "/model", "quota"]
.forEach((l, i) => w(DIM + l.padEnd(widths[i]!) + R));
w("\n");

// status bar values
w(TEXT + cwd.padEnd(widths[0]!) + R);
w(TEXT + branch.padEnd(widths[1]!) + R);
w((sandbox ? OK : WARN) + (sandbox ? "sandbox" : "no sandbox").padEnd(widths[2]!) + R);
w(TEXT + modelDisplay.padEnd(widths[3]!) + R);
w(OK + quotaPct + "% used" + R);
w("\n\n");

// input box
const placeholder = "Type your message or @path/to/file";
const padR    = Math.max(0, C - 4 - placeholder.length - 2);
const blankRow = BOX_BG + " ".repeat(C) + R + "\n";
const inputRow = BOX_BG + "  " + accent + "› " + DIM + placeholder + " ".repeat(padR) + "  " + R + "\n";
w(blankRow);
w(inputRow);
w(blankRow);
}

private midLine(value: string): string {
  const C      = cols();
  const accent = THEME_COLORS[this.state.theme] ?? MUTED;
  const maxVal = C - 4 - 2;
  const display = value.slice(-maxVal);
  const PHOLDER = "Type your message or @path/to/file";
  const PLACEHOLDER_FG = "\x1b[38;2;82;82;91m";
  const body   = display.length > 0
    ? TEXT + display + R
    : PLACEHOLDER_FG + PHOLDER.slice(0, maxVal) + R;
  const visLen  = display.length > 0 ? display.length : Math.min(PHOLDER.length, maxVal);
  const padDyn  = Math.max(0, C - 4 - visLen - 2);
  return BOX_BG + "  " + accent + "› " + body + BOX_BG + " ".repeat(padDyn) + "  " + R;
}

private setCursor(value: string): void {
  const maxVal = cols() - 6;
  const visLen = Math.min(value.length, maxVal);
  w(`\x1b[${visLen + 5}G`);
}

private parseContent(content: string): { type: "text" | "code"; lang?: string; value: string }[] {
  const parts: ReturnType<typeof this.parseContent> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "text", value: match[2]!.trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: "text", value: content }];
}

private renderMessage(content: string): string {
  if (!this.highlighter) return content;

  const parts = this.parseContent(content);
  let output = "";

  for (const part of parts) {
    if (part.type === "text") {
      output += prettify(part.value);
    } else {
      try {
        const tokens = this.highlighter.codeToTokensBase(part.value, {
          lang: part.lang! as BundledLanguage,
          theme: "gruvbox-dark-hard",
        });
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

private startLoader(label: string): void {
  this.stopLoader();
  this.loader = new GooLoader("green").start();
  this.loader.setLabel(label);
}

private stopLoader(): void {
  if (this.loader) {
    this.loader.stop();
    this.loader = null;
  }
}

private readLine(): Promise<string> {
  return new Promise((resolve) => {
    let value = "";
    this.prevSuggCount  = 0;
    this.selectedIndex  = 0;
    this.suggestions    = [];
    this.cmdSuggestions = [];

    w("\x1b[2A");
    w("\r\x1b[K" + this.midLine(value));
    this.setCursor(value);
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
      if (this.prevSuggCount === 0) return;
      w("\x1b[1B");
      for (let i = 0; i < this.prevSuggCount; i++) w("\r\x1b[K\n");
      w(`\x1b[${this.prevSuggCount + 1}A`);
      this.prevSuggCount = 0;
    };

    const renderSuggestions = () => {
      clearSuggestions();
      const mention = getCurrentFileMention(value);

      if (mention) {
        this.suggestions    = searchFile(mention, this.projectFils) || []
        this.cmdSuggestions = [];

        if (this.suggestions.length > 0) {
          w("\x1b[1B");
          this.suggestions.forEach((file, index) => {
            const prefix = index === this.selectedIndex ? "› " : "  ";
            const color  = index === this.selectedIndex ? TEXT : SUGG_CMD;
            w("\r\x1b[K" + prefix + color + file + R + "\n");
          });
          w(`\x1b[${this.suggestions.length + 1}A`);
          this.prevSuggCount = this.suggestions.length;
        }
      } else {
        this.suggestions    = [];
        this.cmdSuggestions = filterCommand(value);

        if (this.cmdSuggestions.length > 0) {
          w("\x1b[1B");
          this.cmdSuggestions.forEach((cmd) => {
            w("\r\x1b[K  " + SUGG_CMD + cmd.name.padEnd(12) + SUGG_DESC + cmd.desc + R + "\n");
          });
          w(`\x1b[${this.cmdSuggestions.length + 1}A`);
          this.prevSuggCount = this.cmdSuggestions.length;
        }
      }
    };

    const redraw = () => {
      w("\r\x1b[K" + this.midLine(value));
      renderSuggestions();
      this.setCursor(value);
    };

    this.ensureFilesLoaded();

    const onData = async (key: string) => {
      if (key === "\x1b[A") {
        if (this.suggestions.length > 0) {
          this.selectedIndex = Math.max(0, this.selectedIndex - 1);
          redraw();
        }
        return;
      }

      if (key === "\x1b[B") {
        if (this.suggestions.length > 0) {
          this.selectedIndex = Math.min(this.suggestions.length - 1, this.selectedIndex + 1);
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
        this.selectedIndex = 0;
        redraw();
        return;
      }

      if (key === "\t") {
        if (this.suggestions.length > 0) {
          const selected = this.suggestions[this.selectedIndex];
          value = value.replace(/@([^\s]*)$/, `@${selected}`);
          this.selectedIndex = 0;
        } else if (this.cmdSuggestions.length === 1) {
          value = this.cmdSuggestions[0]!.name + " ";
        }
        redraw();
        return;
      }

      if (key === "@") {
        value += key;
        await this.ensureFilesLoaded();
        this.selectedIndex = 0;
        redraw();
        return;
      }

      if (key.charCodeAt(0) >= 32) {
        value += key;
        this.selectedIndex = 0;
        redraw();
        return;
      }
    };

    process.stdin.on("data", onData);
  });
}

private handleHelp(): void {
  this.pushAssistant([
    "/help           show this help",
    "/clear          clear conversation",
    "/model          show current models",
    "/plannerModel   change planner model",
    "/pull           pull an Ollama model",
    "/memory         show what Goo remembers",
    "/history        show recent history",
    "/quit           quit",
    ].join("\n"));
  this.repaint();
}

private handleClear(): void {
  this.state.messages= [];
  clearHistory();
  this.repaint();
}

private handleModel(): void {
  this.pushAssistant(
    `Response model:  ${this.state.model}\nPlanner model:   ${this.state.plannerModel}`
  );
  this.repaint();
}

private async handleMemory(): Promise<void> {
  try {
    const db   = new Database(DB_PATH);
    const rows = db.query(
      `SELECT id, file_path, chunk_index FROM chunks ORDER BY updated_at DESC LIMIT 20`
    ).all() as { id: string; file_path: string; chunk_index: number }[];
    db.close();

    if (!rows.length) {
      this.pushAssistant("No memories yet. Keep chatting and I'll start remembering things.");
    } else {
      const lines: string[] = [`I remember ${rows.length} things about you:\n`];
      for (const row of rows) {
        try {
          const raw  = await Bun.file(row.file_path).text();
          const body = raw.replace(/^---[\s\S]*?---\n/, "").trim();
          lines.push(`· ${body.split("\n")[0] ?? ""}`);
        } catch {}
      }
      this.pushAssistant(lines.join("\n"));
    }
  } catch {
    this.pushAssistant("Could not load memories.");
  }
  this.repaint();
}

private async handleHistory(): Promise<void> {
  const history = await loadHistory();
  const last10  = history.slice(-10);

  if (!last10.length) {
    this.pushAssistant("No history yet.");
  } else {
    const lines = last10.map((m, i) => {
      const label = m.role === "user" ? "you" : " ai";
      return `${String(i + 1).padStart(2)}. ${label}  ${m.content.slice(0, 72)}${m.content.length > 72 ? "…" : ""}`;
    });
    this.pushAssistant(lines.join("\n"));
  }
  this.repaint();
}

private async handlePull(): Promise<void> {
  this.stopLoader();
  w(SHOW);

  const modelName = await input({ message: "Enter model name" });

  w(HIDE);
  this.startLoader(`pulling ${modelName}`);

  try {
    await pullModel({
      model: modelName,
      onProgress: (progress) => {
        if (progress.total && progress.completed) {
          const pct = Math.round((progress.completed / progress.total) * 100);
          this.loader?.setLabel(`pulling ${modelName} ${pct}%`);
        } else {
          this.loader?.setLabel(progress.status);
        }
      },
    });
    this.stopLoader();
    this.pushAssistant(`✅ ${modelName} pulled successfully`);
  } catch {
    this.stopLoader();
    this.pushAssistant(`❌ Failed to pull ${modelName}`);
  }

  this.repaint();
}

private async handlePlannerModel(): Promise<void> {
  const installed = getInstalledModels();
  w(SHOW);

  const newPlanner = await select({
    message: "Select new planner model",
    choices: installed.map(m => ({
      value: m,
      name: m === this.state.plannerModel ? `${m}  ← current` : m,
    })),
  });

  w(HIDE);
  this.state.plannerModel = newPlanner;
  this.pushAssistant(`✓ Planner model changed to ${newPlanner}`);
  this.repaint();
}

private async handleExit(): Promise<void> {
  const spinner = new SimpleSpinner("Saving your data...", "zinc");
  spinner.start("saving...");
  try {
    await writeDailySummary(this.state.messages, this.state.model);
    spinner.stop("saved!");
  } catch {
    spinner.stop("failed to save");
  }
  w(CLEAR_SCREEN + SHOW);
  console.log("👋 Goodbye!");
}

// ── message handling ─────────────────────────────────────────────────────────
private async handleUserMessage(trimmed: string): Promise<void> {
const spinner = new SimpleSpinner("Thinking...", "zinc");
spinner.start("thinking...");

const { finalPrompt , userQuestion } = await customTrimmed(trimmed);

// searchMemory isn't good until unless we know what to search
// what if user ask normal hi then its a wast of search in memory

// search memory
const memoryBlock = await this.searchMemory(finalPrompt);
spinner.setLabel("searching...");

this.pushUser(trimmed);
this.repaint();

const systemMessage = {
  role: "system" as const,
  content: `You are Goo, an AI CLI assistant.${memoryBlock}`,
};

const messageForModels: { role: "user" | "assistant" | "system"; content: string }[] = [
  systemMessage,
  ...this.state.messages.slice(0, -1),
  { role: "user", content: finalPrompt },
];

this.pushAssistant("");

let assistantContent = "";

try {
spinner.setLabel("Planning...");
const plan = await Planner(finalPrompt, this.state.plannerModel!);

if (plan && plan.type !== "answer") {
spinner.stop("");
await this.handleToolPlan(plan, finalPrompt , spinner);
} else {
assistantContent = await this.handleStream(messageForModels, systemMessage.content, spinner);
}
} catch (error) {
spinner.stop("");
this.replaceLastAssistant(
"❌ Error: " + (error instanceof Error ? error.message : String(error))
);
this.repaint();
}

// extract and save memories in background — don't block UI
if (assistantContent) {
void this.extractAndSave(trimmed, assistantContent);
}

await saveHistory(this.state.messages);
}

private async handleToolPlan(plan: any, finalPrompt: string , spinner: SimpleSpinner): Promise<string> {
spinner.start(' ')
const result = await executePlan(plan, this.state.model, finalPrompt);
spinner.stop(' ')

if (result && typeof result === "object" && "new" in result) {
// code edit — show diff

const diffOutput = await renderDiff({
path:         plan.path,
functionName: plan.name,
oldCode:      "old" in result ? result.old : null,
newCode:      result.new,
});

this.replaceLastAssistant(diffOutput, true);
this.repaint()
return "";
} else if (result && typeof result === "object" && "error" in result) {
this.replaceLastAssistant(`❌ ${result.error}`);
this.repaint()
return ""
} else if (typeof result === "string") {

const streamMessages: { role: "user" | "assistant" | "system", content: string }[] = [
{
role: "system",
content: `You are Goo, an AI CLI assistant. Answer based on the file content provided.`
},
{
role: "user",
content: `${result}\n\nUser request: ${finalPrompt}`
}
]

spinner.start(' ')
return await this.handleStream(streamMessages, "You are Goo, an AI CLI assistant.", spinner)
} else {
this.replaceLastAssistant("✓ Done");
this.repaint();
return "";
}

}

private async handleStream(
messages: { role: "user" | "assistant" | "system"; content: string }[],
system: string,
spinner: SimpleSpinner
): Promise<string> {
spinner.setLabel("Generating response...");

const stream = await chatResponseStream({
messages,
model: this.state.model,
system,
});

let content = "";
let spinnerStopped = false;

for await (const token of stream) {
if (!spinnerStopped) {
spinner.stop(" ")
spinnerStopped = true;
}
content += token;
this.replaceLastAssistant(content);
process.stdout.write(token);
}

if (!spinnerStopped) spinner.stop("");

this.replaceLastAssistant(content)
this.repaint();

return content;
}

private async searchMemory(query: string): Promise<string> {
try {
const memories = await searchMemories(query, 5);
if (memories.length > 0) {
return "\n\n## What you remember about this user\n" +
memories.map(m => `- ${m.content}`).join("\n");
}
} catch {}
return query || ""
}

private async extractAndSave(userMsg: string, aiResponse: string): Promise<void> {
try {
const extracted = await extractedMemory(userMsg, aiResponse, this.state.model);
for (const mem of extracted) {
const id = await nextMemoryId();
await saveMemory({ id, ...mem });
}
} catch {}
}

// ── message helpers ───────────────────────────────────────────────────────────
private pushAssistant(content: string, raw = false): void {
this.state.messages.push({ role: "assistant", content, row: raw });
}

private pushUser(content: string): void {
this.state.messages.push({ role: "user", content });
}

private replaceLastAssistant(content: string, raw = false): void {
this.state.messages[this.state.messages.length - 1] = {
role: "assistant",
content,
row: raw,
};
}

private gitBranch(): string {
try {
return execSync("git rev-parse --abbrev-ref HEAD 2>/dev/null", {
encoding: "utf8",
stdio: ["ignore", "pipe", "ignore"],
}).trim() || "main";
} catch {
return "main";
}
}

}
