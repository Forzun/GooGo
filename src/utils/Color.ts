export function pickTheme(): string | undefined {
  const themes = ["green", "amber", "cyan"];
  return themes[Math.floor(Math.random() * themes.length)];
}

export const colorMap: Record<string, (str: string) => string> = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};
