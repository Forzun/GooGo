import { input } from "@inquirer/prompts";
import chalk from "chalk";
import type { Message } from "ollama/dist/browser.cjs";

export async function startChat(model: string) {
  const history: Message[] = [];

  console.log(
    chalk.cyan("🤖 Chat started. Type /help for commands, /exit to quit.\n"),
  );

  while (true) {
    const userInput = await input({
      message: chalk.green("You"),
    });

    const trimmed = userInput.trim();
    if (!trimmed) continue;

    // Commands
    if (trimmed === "/exit" || trimmed === "/quit") {
      console.log(chalk.gray("\nGoodbye! 👋"));
      break;
    }

    if (trimmed === "/clear") {
      history.length = 0;
      console.log(chalk.gray("  ✓ Conversation cleared.\n"));
      continue;
    }

    if (trimmed === "/history") {
      if (!history.length) {
        console.log(chalk.gray("  No history yet."));
      } else {
        history.forEach((m, i) => {
          const label =
            m.role === "user" ? chalk.green("You") : chalk.blue("AI");
          const preview =
            m.content.slice(0, 80) + (m.content.length > 80 ? "..." : "");
          console.log(`  ${i + 1}. ${label}: ${preview}`);
        });
      }
      continue;
    }

    if (trimmed === "/help") {
      console.log(
        chalk.gray(`
  Commands:
    /clear    Clear conversation history
    /history  Show message history
    /model    Show current model
    /exit     Quit the CLI
    /help     Show this help
      `),
      );
      continue;
    }

    if (trimmed === "/model") {
      console.log(chalk.gray(`  Current model: ${model}`));
      continue;
    }

    history.push({ role: "user", content: trimmed });
    console.log(chalk.blue("AI ->:"), "Echo: " + trimmed);
  }
}
