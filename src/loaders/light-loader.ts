const HIDE  = "\x1b[?25l";
const SHOW  = "\x1b[?25h";
const CLEAR = "\r\x1b[2K";
const RESET = "\x1b[0m";
const BOLD  = "\x1b[1m";
const DIM   = "\x1b[2m";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type ThemeName = "zinc" | "green" | "cyan" | "amber";

const THEMES: Record<ThemeName, { spinner: string; wave: string[] }> = {
  zinc: {
    spinner: "\x1b[38;2;161;161;170m",
    wave: [
      "\x1b[38;2;90;90;96m",
      "\x1b[38;2;130;130;138m",
      "\x1b[38;2;180;180;188m",
      "\x1b[38;2;230;230;238m",
      "\x1b[38;2;180;180;188m",
      "\x1b[38;2;130;130;138m",
      "\x1b[38;2;90;90;96m",
    ],
  },
  green: {
    spinner: "\x1b[38;2;63;185;80m",
    wave: [
      "\x1b[38;2;20;55;25m",
      "\x1b[38;2;35;95;42m",
      "\x1b[38;2;55;140;65m",
      "\x1b[38;2;110;230;125m",
      "\x1b[38;2;55;140;65m",
      "\x1b[38;2;35;95;42m",
      "\x1b[38;2;20;55;25m",
    ],
  },
  cyan: {
    spinner: "\x1b[38;2;57;208;216m",
    wave: [
      "\x1b[38;2;15;55;58m",
      "\x1b[38;2;30;95;100m",
      "\x1b[38;2;50;145;152m",
      "\x1b[38;2;110;230;238m",
      "\x1b[38;2;50;145;152m",
      "\x1b[38;2;30;95;100m",
      "\x1b[38;2;15;55;58m",
    ],
  },
  amber: {
    spinner: "\x1b[38;2;227;160;27m",
    wave: [
      "\x1b[38;2;60;42;10m",
      "\x1b[38;2;105;73;18m",
      "\x1b[38;2;160;112;30m",
      "\x1b[38;2;250;200;90m",
      "\x1b[38;2;160;112;30m",
      "\x1b[38;2;105;73;18m",
      "\x1b[38;2;60;42;10m",
    ],
  },
};

// ── Word entry animation ───────────────────────────────────────────────────────
// Each word rises from "invisible" → "dim" → "normal" → "bright+bold" → "normal"
// We fake -y → y by going through brightness stages over 4 ticks per word.
// stages: 0=hidden, 1=very dim, 2=dim, 3=normal, 4=bright pop, 5=settled
const RISE_STAGES = [
  "\x1b[38;2;50;50;55m",    // stage 1 — barely visible (bottom of rise)
  "\x1b[38;2;100;100;108m", // stage 2 — dim
  "\x1b[38;2;160;160;168m", // stage 3 — coming in
  BOLD,                      // stage 4 — bright pop at top
  RESET,                     // stage 5 — settled (wave takes over)
];
const RISE_TICKS = 3; // ticks per stage

interface WordState {
  word: string;
  stage: number;   // 0..5
  tick:  number;   // counts up to RISE_TICKS then advances stage
}

export class SimpleSpinner {
  private spinTimer: NodeJS.Timeout | null = null;
  private frame    = 0;
  private wavePos  = 0;

  private words: WordState[] = [];   // settled words (fully risen)
  private rising: WordState[] = [];  // words currently animating in
  private pendingWords: string[] = []; // words queued to start rising

  private theme: { spinner: string; wave: string[] };
  private themeName: ThemeName;

  constructor(text = "Loading...", themeName: ThemeName = "zinc") {
    this.themeName = themeName;
    this.theme     = THEMES[themeName];
    // seed initial label as already settled
    this.words = text.split(" ").map((w) => ({ word: w, stage: 5, tick: 0 }));
  }

  // ── Wave render on settled text ─────────────────────────────────────────────
  private renderWave(text: string, peak: number): string {
    const shades = this.theme.wave;
    const half   = Math.floor(shades.length / 2);
    let out = "";
    for (let i = 0; i < text.length; i++) {
      const shadeIdx = half - (i - peak);
      const color    = shadeIdx >= 0 && shadeIdx < shades.length
        ? shades[shadeIdx]! : this.theme.spinner;
      out += color + text[i];
    }
    return out + RESET;
  }

  // ── Build the full display line ─────────────────────────────────────────────
  private buildLine(): string {
    const parts: string[] = [];

    // settled words — run wave over them as one joined string
    const settledText = this.words.map((w) => w.word).join(" ");
    if (settledText) {
      const half = Math.floor(this.theme.wave.length / 2);
      parts.push(this.renderWave(settledText, this.wavePos - half));
    }

    // rising words — each gets its own stage color, no wave yet
    for (const rw of this.rising) {
      const stageColor = rw.stage === 4
        ? BOLD + "\x1b[38;2;255;255;255m"  // bright white pop
        : RISE_STAGES[Math.min(rw.stage - 1, RISE_STAGES.length - 1)] ?? this.theme.spinner;
      parts.push(stageColor + rw.word + RESET);
    }

    return parts.join(" ");
  }

  // ── Tick: advance rising animations ─────────────────────────────────────────
  private tick() {
    // start queued words one at a time (stagger by checking if last rising is past stage 2)
    if (this.pendingWords.length > 0) {
      const canStart = this.rising.length === 0
        || this.rising[this.rising.length - 1]!.stage >= 2;
      if (canStart) {
        const word = this.pendingWords.shift()!;
        this.rising.push({ word, stage: 1, tick: 0 });
      }
    }

    // advance each rising word
    for (const rw of this.rising) {
      rw.tick++;
      if (rw.tick >= RISE_TICKS) {
        rw.tick = 0;
        rw.stage++;
      }
    }

    // graduate fully risen words to settled
    const done = this.rising.filter((rw) => rw.stage >= 5);
    if (done.length > 0) {
      this.words.push(...done);
      this.rising = this.rising.filter((rw) => rw.stage < 5);
    }

    // advance wave position
    const totalLen = this.words.map((w) => w.word).join(" ").length;
    this.wavePos = (this.wavePos + 1) % (totalLen + this.theme.wave.length || 1);
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  setLabel(text: string) {
    // replace everything: clear settled + rising, queue new words to rise in
    this.words   = [];
    this.rising  = [];
    this.pendingWords = text.split(" ").filter(Boolean);
    this.wavePos = 0;
  }

  start(initialLabel?: string) {
    if (initialLabel && initialLabel.trim()) this.setLabel(initialLabel);

    process.stdout.write(HIDE);

    this.spinTimer = setInterval(() => {
      this.tick();
      const spinner = FRAMES[this.frame % FRAMES.length]!;
      const line    = this.buildLine();
      process.stdout.write(`${CLEAR}${this.theme.spinner}${spinner}${RESET} ${line}`);
      this.frame++;
    }, 60);

    return this;
  }

  stop(message = "Done") {
    if (this.spinTimer) { clearInterval(this.spinTimer); this.spinTimer = null; }
    process.stdout.write(`${CLEAR}${this.theme.spinner}${RESET} ${message}\n${SHOW}`);
  }
}

// ── Demo ──────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const loader = new SimpleSpinner("thinking...", "cyan").start();

  setTimeout(() => loader.setLabel("fetching models"), 2000);
  setTimeout(() => loader.setLabel("almost done"), 4000);
  setTimeout(() => loader.stop("models loaded ✓"), 6000);

  process.on("SIGINT", () => { loader.stop("cancelled"); process.exit(0); });
}
