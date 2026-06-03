#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import { select } from "@inquirer/prompts";
import { GooLoader } from "./loaders/progress";
import { printWelcome } from "./loaders/frontLoader";

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
  const model = await select({
    message: "Select a model",
    choices: [
      { name: "llama3", value: "llama3" },
      { name: "qwen3", value: "qwen3" },
      { name: "deepseek-r1", value: "deepseek-r1" },
    ],
  });

  console.log(model);
});

program
  .command("list")
  .description("List all the available models")
  .action(async () => {
    const model = await select({
      message: "Choose a model",
      choices: [
        {
          name: "Llama 3",
          value: "llama3",
        },
        {
          name: "Qwen 3",
          value: "qwen3",
        },
      ],
    });
    console.log(model);
  });

program.parse();

const options = program.opts();
if (options.debug) {
  console.log("Debug mode is enabled");
  console.log("Options:", options);
}
