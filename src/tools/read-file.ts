export function extractFiles(input: string) {
  const matches = input.match(/@\S+/g) || [];

  return matches.map((m) => m.slice(1));
}

export function getCurrentFileMention(input: string) {
  const match = input.match(/@([^\s]*)$/);

  return match?.[1] ?? null;
}

export async function readFiles(path: string) {
  const file = Bun.file(path);

  if (file.size > 50_000) {
    throw new Error("File too large");
  }

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
    try {
      const content = await readFiles(file);

      context += `
    File: ${file}

    ${content}
    `;
    } catch {
      context += `
       File: ${file}

       [FILE NOT FOUND]
       `;
    }
  }

  const finalPrompt = `
      ${context}

      User Questions
      ${userQuestion}
      `;

  return finalPrompt;
}

export function searchFile(query: string, fiels: string[] = []) {
  if (!query) {
    return null;
  }

  return fiels
    .filter((file) =>
      file.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .slice(0, 9);
}
