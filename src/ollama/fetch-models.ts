import ollama from "ollama";
import { GooLoader } from "../loaders/progress";

type ollamaModel = {
  model: string;
};

export async function pullModels({ model }: ollamaModel) {
  console.log(`\n  Pulling ${model}...\n`);
  const loader = new GooLoader("green").start();
  try {
    const stream = await ollama.pull({
      model,
      stream: true,
    });

    for await (const progress of stream) {
      if (progress.total) {
        const pct = Math.round(progress.completed / progress.total) * 100;
        loader.setLabel(`${progress.status} ${pct}%`);
      } else {
        loader.setLabel(progress.status ?? "working...");
      }
    }
    loader.stop(`${model} ready`);
  } catch (error) {
    console.log(error);
  }
}
