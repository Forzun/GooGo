export function prettify(text: string) {
  return text

    .replace(/^### (.*)$/gm, `${"\x1b[1m"}$1${"\x1b[0m"}`)

    .replace(/\*\*(.*?)\*\*/g, `${"\x2b[1m"}$1${"\x1b[0m"}`)

    .replace(/^(\d+)\.\s+/gm, "• ")

    .replace(/^-\s+/gm, "• ");
}
