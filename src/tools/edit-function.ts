import { chat } from "../ollama/chat";
import { findFunction } from "./find-function";

export async function editFunction({
  path,
  name,
  instruction,
  model,
}: {
  path: string;
  name: string;
  instruction: string;
  model: string;
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

  const prompt = `

You are Goo Editor.


Instruction


${instruction}



Function


${fn.source}



Rules


Return ONLY updated function.


Do not explain.


No markdown.


Do not wrap in \`\`\`.

`;

  const updated = await chat({
    model: model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const final = content.replace(fn.source, updated!);

  await Bun.write(path, final);

  return {
    old: fn.source,
    new: updated,
  };
}
