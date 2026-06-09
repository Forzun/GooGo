const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const RESET = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K\r";

const PALETTE = {
  green: "\x1b[38;2;63;185;80m",
  cyan: "\x1b[38;2;57;208;216m",
  amber: "\x1b[38;2;227;160;27m",
  white: "\x1b[38;2;200;200;200m",
} as const;

type Color = keyof typeof PALETTE;

const TRACK = 13;
const LETTER_CELLS = new Set([1, 2, 3, 4, 7, 8, 9, 10]);
const SNAKE_LEN = 5;
const TAIL_CHARS = ["█", "▓", "▒", "░"];
const DEFAULT_LABELS = ["loading", "fetching", "connecting", "please wait"];

export class GooLoader {
  private pos = 0;
  private direction = 1;
  private covered = new Set<number>();
  private tail: number[] = [];
  private phase: "covering" | "pause" | "uncovering" = "covering";
  private pauseTick = 0;
  private uncoverQueue: number[] = [];
  private labelIdx = 0;
  private dotFrame = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private firstFrame = true;
  private labels: string[];
  private customLabel: string | null = null; // ← holds setLabel() override

  constructor(private color: Color = "green") {
    this.labels = [...DEFAULT_LABELS];
  }

  // ── public API ────────────────────────────────────────────────────────────

  /** Override the label text shown next to the animation */
  setLabel(text: string) {
    this.customLabel = text;
  }

  /** Clear the custom label and go back to cycling defaults */
  clearLabel() {
    this.customLabel = null;
  }

  // ── internal ──────────────────────────────────────────────────────────────

  private tick() {
    if (this.phase === "pause") {
      if (--this.pauseTick <= 0) {
        this.phase = "uncovering";
        this.uncoverQueue = [...this.covered].sort(() => Math.random() - 0.5);
        if (!this.customLabel) {
          this.labelIdx = (this.labelIdx + 1) % this.labels.length;
        }
      }
      return;
    }

    if (this.phase === "uncovering") {
      const c = this.uncoverQueue.shift();
      if (c !== undefined) this.covered.delete(c);
      if (!this.uncoverQueue.length) {
        this.phase = "covering";
        this.covered.clear();
        this.pos = 0;
        this.direction = 1;
        this.tail = [];
      }
      return;
    }

    this.tail = [this.pos, ...this.tail].slice(0, SNAKE_LEN - 1);
    this.pos += this.direction;

    if (this.pos >= TRACK) {
      this.pos = TRACK - 2;
      this.direction = -1;
    }
    if (this.pos < 0) {
      this.pos = 1;
      this.direction = 1;
    }

    if (LETTER_CELLS.has(this.pos)) this.covered.add(this.pos);

    const allCovered = [...LETTER_CELLS].every((c) => this.covered.has(c));
    if (allCovered) {
      this.phase = "pause";
      this.pauseTick = 12;
    }

    this.dotFrame = (this.dotFrame + 1) % 60;
  }

  private render() {
    const color = PALETTE[this.color];
    const DIM = "\x1b[38;2;63;63;70m"; // zinc-700
    const MUTED = "\x1b[38;2;113;113;122m"; // zinc-500

    let track = "";
    for (let i = 0; i < TRACK; i++) {
      const tailIdx = this.tail.indexOf(i);
      if (i === this.pos) {
        track += `${color}█${RESET}`;
      } else if (tailIdx !== -1) {
        track += `${color}${TAIL_CHARS[tailIdx + 1] ?? "░"}${RESET}`;
      } else if (this.covered.has(i)) {
        track += `${color}${LETTER_CELLS.has(i) ? "█" : "·"}${RESET}`;
      } else if (LETTER_CELLS.has(i)) {
        track += `${DIM}·${RESET}`;
      } else {
        track += " ";
      }
    }

    // use customLabel if set, otherwise cycle through defaults
    const label = this.customLabel ?? this.labels[this.labelIdx];
    const dots = this.customLabel
      ? "" // no animated dots when showing custom text (e.g. "downloading 42%")
      : ".".repeat(Math.floor(this.dotFrame / 20) + 1).padEnd(3);

    const line = `  ${color}⠿${RESET} ${track}  ${MUTED}${label}${dots}${RESET}`;

    if (this.firstFrame) {
      process.stdout.write(line);
      this.firstFrame = false;
    } else {
      process.stdout.write(`${CLEAR_LINE}${line}`);
    }
  }

  start() {
    process.stdout.write(HIDE);
    this.tick();
    this.render();
    this.timer = setInterval(() => {
      this.tick();
      this.render();
    }, 60);
    return this;
  }

  stop(message?: string) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const color = PALETTE[this.color];
    if (message) {
      process.stdout.write(`${CLEAR_LINE}  ${color}✔${RESET}  ${message}\n`);
    } else {
      process.stdout.write(`${CLEAR_LINE}`);
    }
    process.stdout.write(SHOW);
  }
}

if (import.meta.main) {
  const color = (process.argv[2] ?? "green") as Color;
  const loader = new GooLoader(color).start();

  setTimeout(() => {
    loader.stop("models loaded");
  }, 5000);
  process.on("SIGINT", () => {
    loader.stop();
    process.exit(0);
  });
}
