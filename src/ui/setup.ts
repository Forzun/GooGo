import { select, input } from "@inquirer/prompts";
import { execSync } from "child_process";
import { listOllamaModels } from "../ollama/client";
import { colorMap, pickTheme } from "../utils/Color";

export function getInstalledModels(): string[] {
  try {
    const raw = execSync("ollama list", { encoding: "utf8" });
    return raw
      .split("\n")
      .slice(1)                          // skip header row
      .map(line => line.split(/\s+/)[0]) // first column is model name
      .filter(Boolean) as string[];
  } catch {
    return [];
  }
}

export async function setupModels(): Promise<{ model: string;  plannerModel: string , color: string }> {
  const ollamaModels = await listOllamaModels();
  const installed = getInstalledModels()

  if (!ollamaModels?.length) {
    console.log("⚠️ No models found. Run `ollama pull <model>` first.");
    return {
      plannerModel: "",
      model: "",
      color: ""
    }
  }

  const color = pickTheme() as keyof typeof colorMap;
  const themeColor = colorMap[color]!;

  // normal models selection
  let model: string;
  try {
    model = await select({
      message: themeColor("Select a model"),
      choices: ollamaModels.map((m) => ({
        name: `${themeColor("●")} ${m.name}`,
        value: m.value,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log('\nPrompt was cancelled.');
      process.exit(0);
    } else {
      throw error;
    }
  }
  // pick planner model — suggest small ones at the top
  const RECOMMENDED_SMALL = ["llama3.2", "qwen2.5:1.5b", "qwen2.5:3b", "phi3.5", "gemma2:2b"];

  const plannerChoices = [
    // recommended small models that are installed — show first
    ...installed
      .filter(m => RECOMMENDED_SMALL.some(r => m.startsWith(r)))
      .map(m => ({ value: m, name: `${themeColor("●")} ${m}  ← recommended for planning` })),
    // rest of installed models
    ...installed
      .filter(m => !RECOMMENDED_SMALL.some(r => m.startsWith(r)))
      .map(m => ({ value: m, name: `${themeColor("●")} ${m}`})),
  ];

  let plannerModel: string;

  try {
     plannerModel = await select({
      message: "Select your planner model (used for tool routing — pick something small and fast)",
      choices: plannerChoices,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log('\nPrompt was cancelled.');
      process.exit(0);
    } else {
      throw error;
    }

  }

  console.log(`  ✓ Planner model:   ${plannerModel}`);
  console.log(`\n  Tip: change planner anytime with /plannermodel\n`);

  return { model , plannerModel , color};
}
