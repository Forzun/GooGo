import { Command } from "commander";
import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { type Message } from "../providers/type";

export function chatCommand(): Command {
  return new Command()
    .command("chat")
    .option("-p, --provider <p>", "Override provider (ollama|openrouter)")
    .option("-m, --model <m>", "Override model")
    .option("-s, --system <s>", "Set a system prompt")
    .option("--no-stream", "Disable streaming")
    .action(async (opts) => {
      const history: Message[] = [];

      if (opts.system) {
        console.log(
          chalk.cyan(
            "🤖 Chat started. Type /help for commands, /exit to quit.\n",
          ),
        );
      }

      while (true) {
        const userInput = await input({
          message: chalk.hex("#a1a1aa")(" ›"),
        });

        const message = userInput.trim();

        if (!message) continue;

        if (message === "/exit" || message === "/quit") {
          console.log(chalk.gray("/nGoodbye! "));
          break;
        }

        if (message === "/clear") {
          history.length = 0;
          if (opts.system) {
            history.push({ role: "system", content: opts.system });
          }
          console.log(chalk.gray("   ✓ Conversation cleared.\n"));
          continue;
        }

        if (message === "/history") {
          if (!history) {
            console.log(chalk.gray("  No history yet."));
          } else {
            history.forEach((m, i) => {
              const label =
                m.role === "user"
                  ? chalk.green("You")
                  : m.role === "system"
                    ? chalk.yellow("Sys")
                    : chalk.blue("Ai");

              const preview =
                m.content.slice(0, 80) + (m.content.length > 80 ? "..." : "");
              console.log(` ${i + 1}. ${label}: ${preview}`);
            });
          }
          continue;
        }

        if (message === "/help") {
          console.log(
            chalk.gray(`
            Commands:
            /clear    Clear conversation history
            /history  Show message history
            /exit     Quit the CLI
            /help     Show this help
            /list     To show all models
            `),
          );
          continue;
        }

        history.push({ role: "user", content: message });
        console.log(chalk.hex("#e4e4e7")(" › "), "Echo: " + message);
      }
    });
}
