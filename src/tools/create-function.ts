import { chat } from "../ollama/chat";
import { cleanCode } from "../utils/filter";
import { findFunction } from "./find-function";

export async function createFunction({
  path,
  name,
  instruction,
  model,
  prompt,
}: {
  path: string;
  name: string;
  instruction: string;
  model: string;
  prompt: string;
}) {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    throw new Error(`file is not exit ${path}`);
  }

  const content = await file.text();

  const existing = findFunction(name, content);

  if (existing) {
    throw new Error(
      `Function "${name}" already exists in ${path}. Use edit_function instead.`,
    );
  }

  const agentPrompt = `
  You are Goo Editor.
  You are adding a brand new function to an existing file.

  File Path
  ${path}

  New Function Name
  ${name}

  User Request
  ${prompt}

  Instruction
  ${instruction}

  Existing File Content (for context only — do not repeat it)
  ${content}

  Rules
  - Write ONE new function named exactly "${name}".
  - Match the existing file's style: same quote style, semicolons, indentation.
  - Do not modify any existing code.
  - Do not add imports unless absolutely required — if required, only return the function, imports will be handled separately.
  - Do not add markdown.
  - Do not explain your changes.
  - Return ONLY the new function — nothing else.

  New Function
  `;

  const generated = await chat({
    model: model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  if (!generated) {
    throw new Error("Model returned no response");
  }

  const cleaned = cleanCode(generated);
  const final = content.trimEnd() + "\n\n" + cleaned + "\n";

  await Bun.write(path, final);

  return {
    old: null,
    new: cleaned,
  };
}
