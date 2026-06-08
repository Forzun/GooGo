#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { select, editor } from "@inquirer/prompts";
import { listOllamaModels } from "./ollama/client";
import { colorMap, pickTheme } from "./utils/Color";
import { printWelcome } from "./loaders/frontLoader";
import { chatCommand } from "./commands/chat";

const program = new Command();

printWelcome({
  appName: "Goo CLI",
  version: "v0.1.0",
  line1Label: "Signed in with",
  line1Hint: "/auth",
  line2Label: "Model:",
  line2Hint: "/upgrade",
});

function showError(message: string) {
  console.error(chalk.red.bold(`Error: ${message}`));
  process.exit(1);
}

program
  .name("ai")
  .description("A CLI application built with Commander.js")
  .version("1.0.0")
  .option("-d, --debug", "output extra debugging information")
  .option("-f, --file <path>", "specify the file to process")
  .option("-t, --timeout <seconds>", "specify the timeout in seconds", "30")
  .option("-v, --verbose", "enable verbose output");

const validType = ["default", "special", "custom"];

program.addCommand(chatCommand());

program
  .command("create")
  .description("Create a new item with interactive input")
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Enter the item name:",
        validate: (input) =>
          input.length >= 3
            ? true
            : "The name must be at least 3 characters long.",
      },
      {
        type: "list",
        name: "type",
        message: "Select the item type:",
        choices: ["default", "special", "custom"],
      },
    ]);

    console.log(
      chalk.green(
        `Successfully created item "${answers.name}" of type "${answers.type}"`,
      ),
    );
  });

program.action(async () => {
  const ollamaModels = await listOllamaModels();

  if (ollamaModels == undefined) {
    await editor({
      message: "No model yet",
      theme: {
        prefix: {
          color: "cyan",
        },
      },
    });
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

program
  .command("list")
  .description("List all the available models")
  .action(async () => {
    const ollamaModels = await listOllamaModels();

    if (ollamaModels == undefined) {
      return;
    }

    const model = await select({
      message: "Choose a model",
      choices: ollamaModels.map((m) => ({
        name: `${m.name}`,
        value: m.name,
      })),
    });
  });

program.parse();

if (process.argv.length === 2) {
  process.argv.push("chat");
}

const options = program.opts();
if (options.debug) {
  console.log("Debug mode is enabled");
  console.log("Options:", options);
}
