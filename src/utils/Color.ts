export function pickTheme(): string | undefined {
  const themes = ["zinc", "green", "amber", "cyan"];
  return themes[Math.floor(Math.random() * themes.length)];
}

export const colorMap: Record<string, (str: string) => string> = {
  zinc: (s) => `\x1b[38;2;161;161;170m${s}\x1b[0m`,
  green: (s) => `\x1b[38;2;74;222;128m${s}\x1b[0m`,
  amber: (s) => `\x1b[38;2;251;191;36m${s}\x1b[0m`,
  cyan: (s) => `\x1b[38;2;34;211;238m${s}\x1b[0m`,
};
