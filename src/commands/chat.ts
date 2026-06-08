import { Command } from "commander";
import { input } from "@inquirer/prompts";
import chalk from "chalk";
import { type Message } from "./providers/type";

export function chatCommand(): Command {
  return new Command()
    .command("chat")
    .option("-p, --provider <p>", "Override provider (ollama|openrouter)")
    .option("-m, --model <m>", "Override model")
    .option("-s, --system <s>", "Set a system prompt")
    .option("--no-stream", "Disable streaming")
    .action(async (opts) => {
      const response = await input({
        message: "write Something",
      });

      const history: Message[] = [];
      if (opts.system) history.push({ role: "system", content: "" });

      const prompt = () => process.stdout.write(chalk.green("Your ->: "));

      for await (const line of console) {
        const input = (line as string).trim();

        if (!input) {
          prompt();
          continue;
        }

        if (input === "/exit" || input === "/quit") {
          console.log(chalk.gray("\nGoodbye! 👋"));
          process.exit(0);
        }
        if (input === "/clear") {
          history.length = 0;
          if (opts.system)
            history.push({ role: "system", content: opts.system });
          console.log(chalk.gray("  ✓ Conversation cleared.\n"));
          prompt();
          continue;
        }

        if (input === "/history") {
          if (!history.length) console.log(chalk.gray("  No history yet."));
          else {
            history.forEach((m, i) => {
              const r =
                m.role === "user" ? chalk.green("You") : chalk.blue("AI");
              console.log(
                `${i + 1}. ${r} ${m.content.slice(0, 80)} ${m.content.length > 80 ? "..." : ""}`,
              );
            });
          }
          prompt();
          continue;
        }

        if (input === "/help") {
          console.log(
            chalk.gray(`
              /clear    Clear conversation history
              /history  Show message history
              /exit     Quit the CLI
              /help     Show this help
              `),
          );
          prompt();
          continue;
        }

        history.push({ role: "user", content: input });
      }
    });
}
