export function extractFiles(input: string) {
  const matches = input.match(/@\S+/g) || [];

  return matches.map((m) => m.slice(1));
}

export async function readFiles(path: string) {
  const file = Bun.file(path);

  if (!(await file.exists())) {
    throw new Error(`File not found ${path}`);
  }

  return await file.text();
}

export function clearPrompt(prompt: string) {
  return prompt.replace(/@\S+/g, "").trim();
}

export async function customTrimmed(prompt: string) {
  const files = extractFiles(prompt);
  const userQuestion = clearPrompt(prompt);

  let context = "";

  for (const file of files) {
    const content = await readFiles(file);

    context += `
    File: ${file}

    ${content}
    `;
  }

  const finalPrompt = `
      ${context}

      User Questions
      ${userQuestion}
      `;

  return finalPrompt;
}
