import chalk from "chalk";

export function showError(message: string) {
  console.log(chalk.red.bold(`Error: ${message}`));
  process.exit(1);
}
