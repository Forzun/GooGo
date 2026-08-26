
const R    = "\x1b[0m";
const BOLD = "\x1b[1m";
const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR = "\r\x1b[2K";
const UP   = (n: number) => `\x1b[${n}A`;

// ── Palette ───────────────────────────────────────────────────────────────────

const B  = "\x1b[38;2;147;112;219m";   // #9370DB purple body
const BG = "\x1b[48;2;147;112;219m";   // purple fill
const BL = "\x1b[38;2;180;160;255m";   // lighter highlight
const BD = "\x1b[38;2;100;60;180m";    // darker shadow

// const B = "\x1b[38;2;91;127;229m";    // blue body
// const BL = "\x1b[38;2;140;168;245m";   // light blue highlight
// const BD = "\x1b[38;2;55;90;185m";     // dark blue shadow
// const BG = "\x1b[48;2;91;127;229m";    // blue BG (fill)
const BGL= "\x1b[48;2;140;168;245m";   // light blue BG
const BGD= "\x1b[48;2;55;90;185m";     // dark blue BG
const E  = "\x1b[38;2;17;19;22m";      // eye dark
const EBG= "\x1b[48;2;17;19;22m";      // eye BG
const W  = "\x1b[38;2;255;255;255m";   // white shine
const WBG= "\x1b[48;2;255;255;255m";   // white BG
const PK = "\x1b[38;2;180;200;255m";   // cheek blush (light periwinkle)
const Z  = "\x1b[38;2;140;168;245m";   // zzz color

// angry overrides
const AR = "\x1b[38;2;186;54;54m";
const ARB= "\x1b[48;2;186;54;54m";
const AE = "\x1b[38;2;97;0;0m";
const AEB= "\x1b[48;2;97;0;0m";

// uneasy override
const UN = "\x1b[38;2;173;195;255m";
const UNB= "\x1b[48;2;173;195;255m";

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

// ── Eye builders — using half-block + space combos for a thick fluffy look ────
// Each eye is rendered as colored BG blocks to look round and filled

// eye pixel: one "cell" = BG color + space
const eb  = (bg: string) => `${bg} ${R}`;   // one eye-color cell
const dot  = eb(EBG);                         // dark eye cell
const lite = eb(WBG);                         // white shine cell
const skip = "  ";                            // transparent cell (2 chars)

// Build a 2×2 eye: [topRow, botRow] each 4 chars wide
// normal eye (tall oval): 2 dark rows
const eyeN  = { t: `${dot}${dot}`, b: `${dot}${lite}` };
// wide/surprised eye: big
const eyeW  = { t: `${dot}${dot}`, b: `${dot}${lite}` };
// closed eye (horizontal line)
const eyeC  = { t: `${dot}${dot}`, b: `${skip}${skip}` };
// squint (half closed)
const eyeSq = { t: `${dot}${dot}`, b: `${skip}${skip}` };
// angry eye (just bottom cells, brow effect)
const eyeA  = { t: `${skip}${dot}`, b: `${dot}${dot}` };
// joyful (arch — just top)
const eyeJ  = { t: `${dot}${dot}`, b: `${skip}${skip}` };
// skeptical right: right eye squint
const eyeSR = { t: `${dot}${dot}`, b: `${dot}${lite}` };   // left normal
const eyeSRr= { t: `${dot}${dot}`, b: `${skip}${skip}` };  // right squint

// ── Frame builder ─────────────────────────────────────────────────────────────
// 7 rows, ~14 chars wide. Body uses BG fills for a solid fluffy blob.
// Layout:
//   row0:  "  ▄▄▄▄▄▄▄▄  "   top fluff
//   row1:  " █          █ "  upper body
//   row2:  "█  [eye] [eye] █"  eye row top
//   row3:  "█  [eye] [eye] █"  eye row bot
//   row4:  "█    mouth    █"  mouth
//   row5:  " █          █ "  lower body
//   row6:  "  ▀▀▀  ▀▀▀  "   feet

type Frame = string[];

function build(
  bodyC: string, bodyBG: string,           // body fg/bg colors
  eyeCC: string, eyeBGC: string,           // eye colors
  lEye: { t: string; b: string },          // left eye {topRow, botRow}
  rEye: { t: string; b: string },          // right eye
  mouth: string,                           // mouth char(s)
  cheek: boolean,                          // show cheek blush
  extra = ""                               // extra suffix on row3 (e.g. zzz)
): Frame {
  const c = bodyC; const cbg = bodyBG;
  const ck = cheek ? `${PK}·${R}` : " ";

  // helpers: body-filled cell and empty (transparent bg) cell
  const f = `${cbg} ${R}`;  // filled body cell
  const _ = "  ";            // empty 2-char cell

  return [
    // row0 — top cap
    `   ${c}${BOLD}╭─────────╮${R}`,
    // row1 — upper body
    `  ${c}${BOLD}│${R}${f}${f}${f}${f}${f}${f}${c}${BOLD}│${R}`,
    // row2 — eye top halves
    `  ${c}${BOLD}│${R}${f}${ck}${lEye.t}${f}${f}${rEye.t}${ck}${c}${BOLD}│${R}`,
    // row3 — eye bot halves + mouth
    `  ${c}${BOLD}│${R}${f}${f}${lEye.b}${f}${f}${rEye.b}${f}${c}${BOLD}│${R}${extra}`,
    // row4 — mouth row
    `  ${c}${BOLD}│${R}${f}${f}${f}${mouth}${f}${f}${f}${c}${BOLD}│${R}`,
    // row5 — lower body
    `  ${c}${BOLD}│${R}${f}${f}${f}${f}${f}${f}${c}${BOLD}│${R}`,
    // row6 — feet
    `   ${c}${BOLD}╰─────────╯${R}`,
  ];
}

// mouth strings (2 chars wide to center nicely)
const M = {
  neutral:  `${B}ᵕ ${R}`,
  smile:    `${B}‿ ${R}`,
  wide:     `${B}▽ ${R}`,
  open:     `${B}○ ${R}`,
  flat:     `${B}─ ${R}`,
  frown:    `${B}⌒ ${R}`,
  smirk:    `${B}╮ ${R}`,
};

export function renderStrobi(expr: StrobExpr): Frame {
  // default body colors
  let c = B; let cbg = BG;
  let angry = false; let uneasy = false;
  if (expr === "angry-brows") { c = AR; cbg = ARB; angry = true; }
  if (expr === "uneasy-left") { c = UN; cbg = UNB; uneasy = true; }

  const eyeDark  = angry ? AEB : EBG;
  const dot2 = `${eyeDark} ${R}`;
  const lit2  = angry ? `${AEB} ${R}` : lite;

  const eN  = { t: `${dot2}${dot2}`, b: `${dot2}${lit2}` };
  const eW  = { t: `${dot2}${dot2}`, b: `${dot2}${lit2}` };
  const eC  = { t: `${dot2}${dot2}`, b: `${skip}${skip}` };
  const eSq = { t: `${dot2}${dot2}`, b: `${skip}${skip}` };
  const eA  = { t: `${skip}${dot2}`, b: `${dot2}${dot2}` };
  const eJ  = { t: `${dot2}${dot2}`, b: `${skip}${skip}` };
  const eSRn= { t: `${dot2}${dot2}`, b: `${dot2}${lit2}` };
  const eSRs= { t: `${dot2}${dot2}`, b: `${skip}${skip}` };

  const mouth = (k: keyof typeof M) =>
    angry ? `${AR}${M[k]}${R}`.replace(B, AR) : M[k];

  switch (expr) {
    case "neutral":
    case "small-attentive":
    case "attentive-left":
    case "gentle-downward-gaze":
      return build(c, cbg, E, EBG, eN, eN, M.neutral, true);

    case "upward-side-glance":
    case "far-right-glance":
      return build(c, cbg, E, EBG, eN, eN, M.flat, false);

    case "downward-gaze":
      return build(c, cbg, E, EBG, eN, eN, M.flat, true);

    case "joyful-wide":
    case "joyful-down-right":
      return build(c, cbg, E, EBG, eJ, eJ, M.wide, true);

    case "playful-right":
      return build(c, cbg, E, EBG, eJ, eJ, M.smile, true);

    case "surprised-left":
    case "surprised-wide-left":
    case "wide-downward-gaze":
    case "wide-down-left":
      return build(c, cbg, E, EBG, eW, eW, M.open, false);

    case "sleepy-squint":
      return build(c, cbg, E, EBG, eSq, eSq, M.neutral, false);

    case "eyes-closed":
    case "drowsy-closed": {
      const fr = build(c, cbg, E, EBG, eC, eC, M.neutral, false, `  ${Z}z z${R}`);
      return fr;
    }

    case "skeptical-right":
    case "suspicious-right":
      return build(c, cbg, E, EBG, eSRn, eSRs, M.smirk, false);

    case "skeptical-left":
      return build(c, cbg, E, EBG, eSRs, eSRn, M.smirk, false);

    case "angry-right":
    case "angry-left":
      return build(c, cbg, E, EBG, eA, eA, M.frown, false);

    case "curious-left":
    case "asymmetric-down-right":
    case "asymmetric-up-left":
      return build(c, cbg, E, EBG, eSRn, eSRs, M.open, false);

    case "shy-downward":
      return build(c, cbg, E, EBG, eSq, eSq, M.neutral, true);

    case "angry-brows":
      return build(c, cbg, AE, AEB, eA, eA, `${AR}⌒ ${R}`, false);

    case "uneasy-left":
      return build(c, cbg, E, EBG, eSRn, eSRs, M.frown, false, `  ${UN}~ ~${R}`);

    default:
      return build(c, cbg, E, EBG, eN, eN, M.neutral, true);
  }
}

const ROWS = 7;  // must match frame length above

export function printStrobi(expr: StrobExpr = "neutral") {
  renderStrobi(expr).forEach((l) => process.stdout.write(l + "\n"));
}

// ── StrobiSpinner ─────────────────────────────────────────────────────────────
const SPIN_FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
const SC = "\x1b[38;2;91;127;229m";
const DC = "\x1b[38;2;113;113;122m";

export class StrobiSpinner {
  private timer:   NodeJS.Timeout | null = null;
  private frame    = 0;
  private exprIdx  = 0;
  private exprTick = 0;
  private drawn    = false;
  private label    = "";
  private anim:    StrobExpr[];
  private holdTicks: number;

  constructor(animationName = "thinking", holdMs = 2300, tickMs = 80) {
    this.anim      = ANIMATIONS[animationName] ?? ANIMATIONS["idle"]!;
    this.holdTicks = Math.round(holdMs / tickMs);
  }

  setLabel(text: string)       { this.label = text; }
  setAnimation(name: string)   {
    this.anim     = ANIMATIONS[name] ?? ANIMATIONS["idle"]!;
    this.exprIdx  = 0;
    this.exprTick = 0;
  }

  private draw() {
    const lines    = renderStrobi(this.anim[this.exprIdx % this.anim.length]!);
    const spinChar = SPIN_FRAMES[this.frame % SPIN_FRAMES.length]!;

    if (this.drawn) process.stdout.write(UP(ROWS));

    lines.forEach((line, i) => {
      let row = CLEAR + line;
      // attach spinner label on middle row (row 3)
      if (i === 3) row += `   ${SC}${spinChar}${R} ${DC}${this.label}${R}`;
      process.stdout.write(row + "\n");
    });

    this.drawn = true;
    this.frame++;
    this.exprTick++;
    if (this.exprTick >= this.holdTicks) {
      this.exprTick = 0;
      this.exprIdx  = (this.exprIdx + 1) % this.anim.length;
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
    renderStrobi("joyful-wide").forEach((line, i) => {
      let row = CLEAR + line;
      if (i === 3) row += `   ${SC}✓${R} ${DC}${message}${R}`;
      process.stdout.write(row + "\n");
    });
    process.stdout.write(SHOW);
  }
}

// ── Demo ──────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const s = new StrobiSpinner("thinking");
  s.start("thinking...");

  setTimeout(() => { s.setAnimation("searching"); s.setLabel("searching..."); }, 3000);
  setTimeout(() => { s.setAnimation("happy");     s.setLabel("almost done!"); }, 6000);
  setTimeout(() => s.stop("done!"),                                              9000);

  process.on("SIGINT", () => { s.stop("cancelled"); process.exit(0); });
}
