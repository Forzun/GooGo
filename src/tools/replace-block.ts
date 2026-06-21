export function replaceBlock(
  content: string,
  oldBlock: string,
  newBlock: string,
) {
  return content.replace(oldBlock, newBlock);
}
