import { Command } from "commander";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";
import { type Message } from "../providers/type";
import { listOllamaModels } from "../ollama/client";
import { colorMap, pickTheme } from "../utils/Color";
import { initHighlighter } from "../lib/shiki";
import { startChat } from "../utils/startChat";

export function chatCommand(): Command {
  return new Command()
    .command("chat")
    .description("Start a chat session")
    .action(async (opts) => {
      const ollamaModels = await listOllamaModels();

      if (!ollamaModels || ollamaModels.length === 0) {
        console.log(
          chalk.yellow("⚠️  No models found. Run `ollama pull <model>` first."),
        );
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
      console.log(chalk.gray(`\nUsing model: ${selectedModel}\n`));

      await initHighlighter();
      await startChat(selectedModel, color);
    });
}
