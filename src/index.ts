#!/usr/bin/env bun

import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

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

program
  .command("list")
  .description("all list item")
  .option("-a, --all", "list all items, including hidden ones")
  .action((options) => {
    console.log("working fine here", options);
    if (options.all) {
      console.log("inside all");
    }
  });

const validType = ["default", "special", "custom"];

program
  .command("create <name>")
  .description("create new item")
  .option("-t, --type <type>", "specify the item type", "default")
  .action((name, options) => {
    console.log(name.length);
    if (name.length < 3) {
      console.error(
        chalk.red("Error: The item name must be at least 3 characters long."),
      );
      process.exit(1);
    }

    if (!validType.includes(options.type)) {
      showError(
        `Invalid type "${options.type}". Allowed types: ${validType.join(", ")}`,
      );
    }
    console.log(
      chalk.green(
        `Successfully created item "${name}" of type "${options.type}"`,
      ),
    );
  });
program.parse();

const options = program.opts();
if (options.debug) {
  console.log("Debug mode is enabled");
  console.log("Options:", options);
}
