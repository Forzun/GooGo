const HIDE = "\x2b[?25l";
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

// Snake crawls across a tiny 16-cell track, leaving a fading tail
// The "Goo" text is rendered as ghost-dots on the track that light up when covered
const TRACK = 16;

// Goo encoded as which positions in the 16-cell track are "lit" letters
// G=0..3, o=5..8, o=10..13  (each letter is 4 cells wide, 1 gap)
const LETTER_CELLS = new Set([0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13]);

const FRAMES_PER_TICK = 1;
const SNAKE_LEN = 4;
const TAIL_CHARS = ["█", "▓", "▒", "░"];

const LABELS = ["loading", "fetching", "connecting", "please wait"];

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

  constructor(private color: Color = "green") {}

  private tick() {
    if (this.phase === "pause") {
      if (--this.pauseTick <= 0) {
        this.phase = "uncovering";
        this.uncoverQueue = [...this.covered].sort(() => Math.random() - 0.5);
        this.labelIdx = (this.labelIdx + 1) % LABELS.length;
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

    // move snake
    this.tail = [this.pos, ...this.tail].slice(0, SNAKE_LEN - 1);
    this.pos += this.direction;

    // bounce at edges
    if (this.pos >= TRACK) {
      this.pos = TRACK - 2;
      this.direction = -1;
    }
    if (this.pos < 0) {
      this.pos = 1;
      this.direction = 1;
    }

    // cover letter cells
    if (LETTER_CELLS.has(this.pos)) this.covered.add(this.pos);

    // check if all letters covered
    const allCovered = [...LETTER_CELLS].every((c) => this.covered.has(c));
    if (allCovered) {
      this.phase = "pause";
      this.pauseTick = 12;
    }

    this.dotFrame = (this.dotFrame + 1) % 60;
  }

  private render() {
    const color = PALETTE[this.color];
    const DIM = "\x1b[38;2;45;50;45m";
    const MUTED = "\x1b[38;2;80;80;80m";

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

    const dots = ".".repeat(Math.floor(this.dotFrame / 20) + 1);
    const label = LABELS[this.labelIdx];

    const line = `  ${color}⠿${RESET} ${track}  ${MUTED}${label}${dots.padEnd(3)}${RESET}`;

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
