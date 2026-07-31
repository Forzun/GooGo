import { select } from "@inquirer/prompts";
import { listOllamaModels } from "../ollama/client";
import { colorMap, pickTheme } from "../utils/Color";
import { initHighlighter, startChat } from "../utils/startChat";
import { Command } from "commander";
import { setupModels } from "../ui/setup";
import {GooChat} from "../chat/Goo";

export async function chatAction() {
  const ollamaModels = await listOllamaModels();
  const {plannerModel } = await setupModels();

  if (!ollamaModels?.length) {
    console.log("⚠️ No models found. Run `ollama pull <model>` first.");
    return;
  }

  const color = pickTheme() as keyof typeof colorMap;
  const themeColor = colorMap[color]!;

  const selectedModel = await select({
    message: themeColor("Select a model"),
    choices: ollamaModels.map((m) => ({
      name: `${themeColor("●")} ${m.name}`,
      value: m.value,
    })),
  });

  await initHighlighter();
  await startChat(selectedModel, color, plannerModel);
}

export function chatCommand() {
  return new Command("chat").description("Start chat").action(async () => {
    const { model , color , plannerModel } = await setupModels()
    const chat = new GooChat(model , "zinc" , plannerModel)

    // if (!ollamaModels?.length) {
    //   console.log("⚠️ No models found. Run `ollama pull <model>` first.");
    //   return;
    // }

    // const color = pickTheme() as keyof typeof colorMap;
    // const themeColor = colorMap[color]!;

    // const selectedModel = await select({
    //   message: themeColor("Select a model"),
    //   choices: ollamaModels.map((m) => ({
    //     name: `${themeColor("●")} ${m.name}`,
    //     value: m.value,
    //   })),
    // });

    await initHighlighter()
    // await startChat(model, color , plannerModel);
    await chat.start()
  });
}
