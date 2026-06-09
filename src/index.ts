#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { listOllamaModels } from "./ollama/client";
import { colorMap, pickTheme } from "./utils/Color";
import { printWelcome } from "./loaders/frontLoader";
import { chatCommand } from "./commands/chat";
import { createCommand } from "./commands/create";
import { startChat } from "./utils/startChat";

const program = new Command();

printWelcome({
  appName: "Goo CLI",
  version: "v0.1.0",
  line1Label: "Signed in with",
  line1Hint: "/auth",
  line2Label: "Model:",
  line2Hint: "/upgrade",
});

program
  .name("ai")
  .description("A CLI application built with Commander.js")
  .version("1.0.0")
  .option("-d, --debug", "output extra debugging information")
  .option("-f, --file <path>", "specify the file to process")
  .option("-t, --timeout <seconds>", "specify the timeout in seconds", "30")
  .option("-v, --verbose", "enable verbose output");

program.addCommand(chatCommand());
program.addCommand(createCommand());

program.action(async () => {
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

  await startChat(selectedModel, color);
});

program.parse();

const options = program.opts();
if (options.debug) {
  console.log("Debug mode is enabled");
  console.log("Options:", options);
}
