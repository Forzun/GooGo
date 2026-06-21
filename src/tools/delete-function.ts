import { findFunction } from "./find-function";

export async function deleteFunction(path: string, name: string) {
  const content = await Bun.file(path).text();

  const fn = findFunction(name, content);

  if (!fn) return;

  const final = content.replaceAll(fn.source, " ");

  await Bun.write(path, final);
}
