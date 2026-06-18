import { select } from "@inquirer/prompts";
import { listOllamaModels } from "../ollama/client";
import { colorMap, pickTheme } from "../utils/Color";
import { initHighlighter, startChat } from "../utils/startChat";
import { Command } from "commander";

export async function chatAction() {
  const ollamaModels = await listOllamaModels();

  if (!ollamaModels?.length) {
    console.log("⚠️ No models found. Run `ollama pull <model>` first.");
    return;
  }

  const color = pickTheme() as keyof typeof colorMap;
  const themeColor = colorMap[color]!;

  const selectedModel = await select({
    message: themeColor("Select a model"),
    choices: ollamaModels.map((m) => ({
      name: `${themeColor("●")} ${m.name}`,
      value: m.value,
    })),
  });

  await initHighlighter();
  await startChat(selectedModel, color);
}

export function chatCommand() {
  return new Command("chat").description("Start chat").action(async () => {
    const ollamaModels = await listOllamaModels();

    if (!ollamaModels?.length) {
      console.log("⚠️ No models found. Run `ollama pull <model>` first.");
      return;
    }

    const color = pickTheme() as keyof typeof colorMap;
    const themeColor = colorMap[color]!;

    const selectedModel = await select({
      message: themeColor("Select a model"),
      choices: ollamaModels.map((m) => ({
        name: `${themeColor("●")} ${m.name}`,
        value: m.value,
      })),
    });

    await initHighlighter();
    await startChat(selectedModel, color);
  });
}
