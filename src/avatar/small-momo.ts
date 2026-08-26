// ── Strobi Compact — 5 rows, single-width cells ───────────────────────────────

const R    = "\x1b[0m";
const BOLD = "\x1b[1m";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR = "\r\x1b[2K";
const UP   = (n: number) => `\x1b[${n}A`;

// ── Palette (Claude orange) ───────────────────────────────────────────────────
const B  = "\x1b[38;2;147;112;219m";   // #9370DB purple body
const BG = "\x1b[48;2;147;112;219m";   // purple fill
const BL = "\x1b[38;2;180;160;255m";   // lighter highlight
const BD = "\x1b[38;2;100;60;180m";    // darker shadow


 const E = "\x1b[38;2;17;19;22m";
const EBG= "\x1b[48;2;17;19;22m";
const W  = "\x1b[38;2;255;255;255m";
const WBG= "\x1b[48;2;255;255;255m";
const PK = "\x1b[38;2;255;200;170m";
const Z  = "\x1b[38;2;245;180;140m";

const AR = "\x1b[38;2;186;54;54m";
const ARB= "\x1b[48;2;186;54;54m";
const AE = "\x1b[38;2;97;0;0m";
const AEB= "\x1b[48;2;97;0;0m";
const UN = "\x1b[38;2;255;210;180m";
const UNB= "\x1b[48;2;255;210;180m";

export type StrobExpr =
  | "neutral" | "upward-side-glance" | "downward-gaze" | "skeptical-right"
  | "small-attentive" | "wide-downward-gaze" | "surprised-left"
  | "sleepy-squint" | "angry-right" | "curious-left" | "asymmetric-down-right"
  | "attentive-left" | "joyful-wide" | "eyes-closed" | "joyful-down-right"
  | "skeptical-left" | "far-right-glance" | "angry-left" | "playful-right"
  | "asymmetric-up-left" | "gentle-downward-gaze" | "wide-down-left"
  | "surprised-wide-left" | "drowsy-closed" | "suspicious-right"
  | "shy-downward" | "angry-brows" | "uneasy-left";

export const ANIMATIONS: Record<string, StrobExpr[]> = {
  sleeping:  ["eyes-closed","drowsy-closed","sleepy-squint"],
  waking:    ["eyes-closed"],
  idle:      ["upward-side-glance","curious-left"],
  listening: ["attentive-left","downward-gaze","gentle-downward-gaze"],
  thinking:  ["curious-left","angry-left","skeptical-left","playful-right","skeptical-right"],
  searching: ["far-right-glance","asymmetric-down-right","surprised-left","wide-down-left","wide-downward-gaze","asymmetric-up-left"],
  working:   ["angry-right","angry-left","joyful-wide","attentive-left"],
  excited:   ["joyful-down-right","playful-right","surprised-wide-left","surprised-left","joyful-wide"],
  bored:     ["sleepy-squint","drowsy-closed","upward-side-glance"],
  suspicious:["skeptical-left","skeptical-right","suspicious-right"],
  angry:     ["angry-right","angry-left"],
  drowsy:    ["sleepy-squint","drowsy-closed","eyes-closed"],
  happy:     ["joyful-down-right","joyful-wide","playful-right","gentle-downward-gaze"],
  curious:   ["surprised-left","surprised-wide-left","upward-side-glance","far-right-glance"],
  confused:  ["skeptical-left","skeptical-right","curious-left"],
  surprised: ["surprised-left","surprised-wide-left"],
  proud:     ["far-right-glance","curious-left","joyful-down-right"],
  shy:       ["upward-side-glance","shy-downward","eyes-closed"],
  sad:       ["sleepy-squint","eyes-closed","drowsy-closed"],
  laughing:  ["joyful-down-right","joyful-wide","playful-right"],
  scared:    ["surprised-left","surprised-wide-left"],
  playful:   ["joyful-down-right","playful-right","joyful-wide","curious-left"],
  celebrate: ["joyful-down-right","curious-left","playful-right"],
};

// ── Compact eye builders (2 chars wide, 1 row) ────────────────────────────────
const cDot  = `${EBG} ${R}`;      // dark eye (1 char)
const cLite = `${WBG} ${R}`;      // white shine (1 char)
const cSkip = " ";                // transparent (1 char)

const cEyeN  = `${cDot}${cLite}`;      // normal
const cEyeW  = `${cDot}${cDot}`;       // wide
const cEyeC  = `${cDot}${cDot}`;       // closed
const cEyeSq = `${cDot}${cSkip}`;      // squint
const cEyeA  = `${cSkip}${cDot}`;      // angry
const cEyeJ  = `${cDot}${cDot}`;       // joyful
const cEyeSR = `${cDot}${cLite}`;      // skeptical normal
const cEyeSRr= `${cDot}${cSkip}`;      // skeptical squint

// ── Compact frame builder (5 rows) ────────────────────────────────────────────
type Frame = string[];

function buildCompact(
  bodyC: string, bodyBG: string,
  lEye: string, rEye: string,
  mouth: string,
  cheek: boolean,
  extra = ""
): Frame {
  const c = bodyC;
  const f = `${bodyBG} ${R}`;      // 1-char body fill (was 2 chars!)
  const ck = cheek ? `${PK}·${R}` : " ";

  return [
    `  ${c}${BOLD}╭───────╮${R}`,
    ` ${c}${BOLD}│${R}${ck}${lEye}${f}${rEye}${ck}${c}${BOLD}│${R}`,
    ` ${c}${BOLD}│${R}${f}${f}${mouth}${f}${f}${c}${BOLD}│${R}${extra}`,
    ` ${c}${BOLD}│${R}${f}${f}${f}${f}${f}${c}${BOLD}│${R}`,
    `  ${c}${BOLD}╰───────╯${R}`,
  ];
}

const M = {
  neutral:  `${B}ᵕ ${R}`,
  smile:    `${B}‿ ${R}`,
  wide:     `${B}▽ ${R}`,
  open:     `${B}○ ${R}`,
  flat:     `${B}─ ${R}`,
  frown:    `${B}⌒ ${R}`,
  smirk:    `${B}╮ ${R}`,
};

export function renderStrobiCompact(expr: StrobExpr): Frame {
  let c = B; let cbg = BG;
  let angry = false;
  if (expr === "angry-brows") { c = AR; cbg = ARB; angry = true; }
  if (expr === "uneasy-left") { c = UN; cbg = UNB; }

  const eyeDark = angry ? AEB : EBG;
  const d = `${eyeDark} ${R}`;
  const l = angry ? `${AEB} ${R}` : cLite;

  const eN  = `${d}${l}`;
  const eW  = `${d}${d}`;
  const eC  = `${d}${d}`;
  const eSq = `${d}${cSkip}`;
  const eA  = `${cSkip}${d}`;
  const eJ  = `${d}${d}`;
  const eSR = `${d}${l}`;
  const eSRr= `${d}${cSkip}`;

  const mouth = (k: keyof typeof M) =>
    angry ? `${AR}${M[k]}${R}`.replace(B, AR) : M[k];

  switch (expr) {
    case "neutral": case "small-attentive": case "attentive-left": case "gentle-downward-gaze":
      return buildCompact(c, cbg, eN, eN, M.neutral, true);

    case "upward-side-glance": case "far-right-glance":
      return buildCompact(c, cbg, eN, eN, M.flat, false);

    case "downward-gaze":
      return buildCompact(c, cbg, eN, eN, M.flat, true);

    case "joyful-wide": case "joyful-down-right":
      return buildCompact(c, cbg, eJ, eJ, M.wide, true);

    case "playful-right":
      return buildCompact(c, cbg, eJ, eJ, M.smile, true);

    case "surprised-left": case "surprised-wide-left": case "wide-downward-gaze": case "wide-down-left":
      return buildCompact(c, cbg, eW, eW, M.open, false);

    case "sleepy-squint":
      return buildCompact(c, cbg, eSq, eSq, M.neutral, false);

    case "eyes-closed": case "drowsy-closed":
      return buildCompact(c, cbg, eC, eC, M.neutral, false, `  ${Z}z z${R}`);

    case "skeptical-right": case "suspicious-right":
      return buildCompact(c, cbg, eSR, eSRr, M.smirk, false);

    case "skeptical-left":
      return buildCompact(c, cbg, eSRr, eSR, M.smirk, false);

    case "angry-right": case "angry-left":
      return buildCompact(c, cbg, eA, eA, M.frown, false);

    case "curious-left": case "asymmetric-down-right": case "asymmetric-up-left":
      return buildCompact(c, cbg, eSR, eSRr, M.open, false);

    case "shy-downward":
      return buildCompact(c, cbg, eSq, eSq, M.neutral, true);

    case "angry-brows":
      return buildCompact(c, cbg, eA, eA, `${AR}⌒ ${R}`, false);

    case "uneasy-left":
      return buildCompact(c, cbg, eSR, eSRr, M.frown, false, `  ${UN}~ ~${R}`);

    default:
      return buildCompact(c, cbg, eN, eN, M.neutral, true);
  }
}

const ROWS = 5;  // was 7

export function printStrobiCompact(expr: StrobExpr = "neutral") {
  renderStrobiCompact(expr).forEach((l) => process.stdout.write(l + "\n"));
}

// ── Compact Spinner ───────────────────────────────────────────────────────────
const SPIN_FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
const SC = "\x1b[38;2;217;119;87m";
const DC = "\x1b[38;2;113;113;122m";

export class StrobiSpinnerCompact {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private exprIdx = 0;
  private exprTick = 0;
  private drawn = false;
  private label = "";
  private anim: StrobExpr[];
  private holdTicks: number;

  constructor(animationName = "thinking", holdMs = 2300, tickMs = 80) {
    this.anim = ANIMATIONS[animationName] ?? ANIMATIONS["idle"]!;
    this.holdTicks = Math.round(holdMs / tickMs);
  }

  setLabel(text: string) { this.label = text; }
  setAnimation(name: string) {
    this.anim = ANIMATIONS[name] ?? ANIMATIONS["idle"]!;
    this.exprIdx = 0;
    this.exprTick = 0;
  }

  private draw() {
    const lines = renderStrobiCompact(this.anim[this.exprIdx % this.anim.length]!);
    const spinChar = SPIN_FRAMES[this.frame % SPIN_FRAMES.length]!;

    if (this.drawn) process.stdout.write(UP(ROWS));

    lines.forEach((line, i) => {
      let row = CLEAR + line;
      if (i === 2) row += `   ${SC}${spinChar}${R} ${DC}${this.label}${R}`;
      process.stdout.write(row + "\n");
    });

    this.drawn = true;
    this.frame++;
    this.exprTick++;
    if (this.exprTick >= this.holdTicks) {
      this.exprTick = 0;
      this.exprIdx = (this.exprIdx + 1) % this.anim.length;
    }
  }

  start(label = "Loading...") {
    this.label = label;
    this.drawn = false;
    process.stdout.write(HIDE);
    this.draw();
    this.timer = setInterval(() => this.draw(), 80);
    return this;
  }

  stop(message = "Done!") {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    process.stdout.write(UP(ROWS));
    renderStrobiCompact("joyful-wide").forEach((line, i) => {
      let row = CLEAR + line;
      if (i === 2) row += `   ${SC}✓${R} ${DC}${message}${R}`;
      process.stdout.write(row + "\n");
    });
    process.stdout.write(SHOW);
  }
}

// ── Demo ──────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const s = new StrobiSpinnerCompact("thinking");
  s.start("thinking...");

  setTimeout(() => { s.setAnimation("searching"); s.setLabel("searching..."); }, 3000);
  setTimeout(() => { s.setAnimation("happy");     s.setLabel("almost done!"); }, 6000);
  setTimeout(() => s.stop("done!"),                                              9000);

  process.on("SIGINT", () => { s.stop("cancelled"); process.exit(0); });
}
