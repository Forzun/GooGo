import { chat } from "../ollama/chat";
import { cleanCode } from "../utils/filter";
import { findFunction } from "./find-function";

export async function editFunction({
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

  console.log(path, name, instruction, model);

  if (!(await file.exists())) {
    throw new Error(`file is not found ${path}`);
  }

  const content = await file.text();

  const fn = findFunction(name, content);

  if (!fn) {
    throw new Error(`Function not found by this name ${name}`);
  }

  console.log("Looking for:", name);
  console.log("Found:", fn);

  const Agent_prompt = `
    You are Goo Editor.

    You are editing source code inside a project.

    You will receive:

    1. The user's request.
    2. The file path.
    3. The function name.
    4. The current implementation.

    Your task is to update ONLY the provided function.

    File Path

    ${path}


    Function Name

    ${name}


    User Request

    ${prompt}


    Current Implementation

    ${fn.source}


    Rules

    - Modify ONLY this function.
    - Do not change imports.
    - Do not modify other functions.
    - Preserve indentation.
    - Preserve formatting style.
    - Do not add markdown.
    - Do not explain your changes.
    - Do not add comments unless explicitly requested.
    - Return ONLY the updated function.
    - If the request cannot be satisfied, return the original function unchanged.


    Updated Function

    `;

  const updated = await chat({
    model: model,
    messages: [
      {
        role: "user",
        content: Agent_prompt,
      },
    ],
  });

  const cleaned = cleanCode(updated!);

  if (
    !cleaned.startsWith("function") &&
    !cleaned.startsWith("export") &&
    !cleaned.startsWith("async")
  ) {
    throw new Error("Model returned invalid function");
  }

  const final = content.slice(0, fn.start) + cleaned + content.slice(fn.end);

  await Bun.write(path, final);

  return {
    old: fn.source,
    new: cleaned,
  };
}
