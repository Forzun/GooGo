#!/usr/bin/env bun

import { Command } from "commander";
import { printWelcome } from "./loaders/frontLoader";
import { chatCommand } from "./commands/chat";
import { createCommand } from "./commands/create";

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
  .version("1.0.0");

program.addCommand(chatCommand());
program.addCommand(createCommand());

if (process.argv.length <= 2) {
  process.argv.push("chat");
}

program.parse();
const options = program.opts();
if (options.debug) {
  console.log("Debug mode is enabled");
  console.log("Options:", options);
}
