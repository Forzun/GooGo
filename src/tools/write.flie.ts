interface WriteFile {
  path: string;
  content: string;
}

export async function WriteFile({ path, content }: WriteFile) {
  const file = Bun.file(path);

  if (await file.exists()) {
    throw new Error("file is not exit");
  }

  await Bun.write(path, content);
}
