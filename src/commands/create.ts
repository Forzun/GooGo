import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";

export function createCommand() {
  return new Command()
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
}
