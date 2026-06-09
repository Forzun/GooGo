import { Command } from "commander";
import { pickTheme } from "../utils/Color";
import { colorMap } from "../utils/Color";
import { select } from "@inquirer/prompts";
import { listOllamaModels } from "../ollama/client";

export function listCommand() {
  return new Command()
    .description("List all the available models")
    .action(async () => {
      const ollamaModels = await listOllamaModels();

      if (ollamaModels == undefined) {
        return;
      }

      const color = pickTheme() as keyof typeof colorMap;
      const themeColor = colorMap[color]!;

      await select({
        message: themeColor("Select a model"),
        choices: ollamaModels?.map((m) => ({
          name: `${themeColor("●")} ${m.name}`,
          value: m.value,
        })),
      });
    });
}
