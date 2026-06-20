interface CreateFile {
  path: string;
  content?: string;
}

export async function createFile({ path, content }: CreateFile) {
  const file = Bun.file(path);

  if (await file.exists()) {
    throw new Error("File is already exit");
  }

  if (!content) {
    content = " ";
  }

  await Bun.write(path, content);
}
