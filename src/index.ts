#!/usr/bin/env bun

console.log("File is running");

import { Command } from "commander";

const program = new Command();

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

program
  .command("create <name>")
  .description("create new item")
  .action((name) => {
    console.log("listing items...", name);
  });

program.parse();

const options = program.opts();
if (options.debug) {
  console.log("Debug mode is enabled");
  console.log("Options:", options);
}
