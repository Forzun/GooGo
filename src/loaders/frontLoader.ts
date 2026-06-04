const R = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

const TITLE = fg(240, 238, 230);
const LABEL = fg(140, 138, 130);
const VALUE = fg(210, 208, 200);
const HINT = fg(90, 88, 82);
const DIVIDER = fg(70, 68, 62);

type LogoTheme = "green" | "amber" | "cyan";

const THEMES: Record<
  LogoTheme,
  { bright: string; dim: string; accent: string }
> = {
  green: {
    bright: fg(80, 200, 120),
    dim: fg(40, 130, 70),
    accent: fg(80, 200, 120),
  },
  amber: {
    bright: fg(255, 180, 40),
    dim: fg(180, 110, 15),
    accent: fg(255, 180, 40),
  },
  cyan: {
    bright: fg(50, 210, 220),
    dim: fg(20, 130, 145),
    accent: fg(50, 210, 220),
  },
};

function pickTheme(): LogoTheme | undefined {
  const themes: LogoTheme[] = ["green", "amber", "cyan"];
  return themes[Math.floor(Math.random() * themes.length)];
}

// ─── Logo glyph (7 × 7 pixel "G") ───────────────────────────────────────────
const G_ROWS = [
  [0, 1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 0],
];

function logoRow(
  bits: number[],
  rowIndex: number,
  theme: ReturnType<typeof pickTheme>,
): string {
  const { bright, dim } = THEMES[theme];
  const fill = rowIndex % 2 === 0 ? bright : dim;
  const cells = bits.map((b) => (b ? `${fill}▉${R}` : " ")).join("");
  return `  ${cells}`;
}

function rule(width = 26): string {
  return `${DIVIDER}${"─".repeat(width)}${R}`;
}

export interface WelcomeOptions {
  appName?: string;
  version?: string;
  logoTheme?: LogoTheme | "random";
  line1Label?: string;
  line1Value?: string;
  line1Hint?: string;
  line2Label?: string;
  line2Value?: string;
  line2Hint?: string;
}

export function printWelcome(opts: WelcomeOptions = {}) {
  const {
    appName = "Goo CLI",
    version = "v0.1.0",
    logoTheme = "random",
    line1Label = "auth",
    line1Value = "Ollama",
    line1Hint = "/auth",
    line2Label = "model",
    line2Value = "llama3.2",
    line2Hint = "/upgrade",
  } = opts;

  const theme = logoTheme === "random" ? pickTheme() : logoTheme;
  const { accent } = THEMES[theme];

  const pad = "    ";
  const textRows: Record<number, string> = {
    1: `${pad}${BOLD}${TITLE}${appName}${R}  ${DIM}${HINT}${version}${R}`,
    2: `${pad}${rule()}`,
    4: `${pad}${LABEL}${line1Label.padEnd(6)}${R}  ${VALUE}${line1Value}${R}  ${HINT}${line1Hint}${R}`,
    5: `${pad}${LABEL}${line2Label.padEnd(6)}${R}  ${accent}${BOLD}${line2Value}${R}  ${HINT}${line2Hint}${R}`,
  };

  let out = "\n";
  G_ROWS.forEach((bits, i) => {
    out += logoRow(bits, i, theme) + (textRows[i] ?? "") + "\n";
  });
  out += process.stdout.write(out);
}

if (
  typeof Bun !== "undefined"
    ? Bun.main === import.meta.path
    : process.argv[1] === new URL(import.meta.url).pathname
) {
  printWelcome();
}
