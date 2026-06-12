import { mkdir, exists } from "node:fs/promises";
import { existsSync } from "node:fs";

const cwd = process.cwd();
const HISTORY_DIR = "./history";
const HISTORY_FILE = "./history/history.json";

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

async function ensureHistoryDir() {
  if (!(await exists(HISTORY_DIR))) {
    await mkdir(HISTORY_DIR, { recursive: true });
  }
}

export async function saveHistory(
  messages: {
    role: "user" | "assistant";
    content: string;
  }[],
) {
  await ensureHistoryDir();

  const history: HistoryEntry[] = messages.map((message) => ({
    role: message.role as "user" | "assistant",
    content: message.content,
    timestamp: Date.now(),
  }));

  await Bun.write(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const file = Bun.file(HISTORY_FILE);
    if (!(await file.exists())) return [];

    const data = await file.text();
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function clearHistory() {
  await Bun.write(HISTORY_FILE, "[]");
}

export async function appendHistory() {
  try {
  } catch (error) {
    console.error("Error while append file:", error);
  }
}
