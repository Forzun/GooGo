import { findFunction } from "./find-function";

export async function renameFunction(
  path: string,
  oldName: string,
  newName: string,
) {
  const content = await Bun.file(path).text();

  console.log("file here:", content);

  const fn = findFunction(oldName, content);

  if (!fn) {
    throw Error("not found");
  }

  const update = fn.source.replace(oldName, newName);

  const final = content.replace(fn.source, update);

  await Bun.write(path, final);

  return {
    old: oldName,
    new: newName,
  };
}
