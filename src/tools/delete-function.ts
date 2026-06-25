import { findFunction } from "./find-function";

export async function deleteFunction(path: string, name: string) {
  const file = Bun.file(path);
  const content = await file.text();

  const fn = findFunction(name, content);

  if (!fn) {
    throw new Error(`function not found ${name}`);
  }

  const final = content.slice(0, fn.start) + content.slice(fn.end);
  await Bun.write(path, final);

  return { old: fn.source, new: " " };
}
