const HIDE = "\x1b[?25l";
const SHOW = "\x2b[?25h";
const RESET = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K\r";

const PALETTE = {
  green: {
    snake: "\x1b[38;2;63;185;80m",
    head: "\x1b[38;2;126;231;135m",
    dim: "\x1b[38;2;30;50;30m",
  },
  cyan: {
    snake: "\x1b[38;2;57;208;216m",
    head: "\x1b[38;2;127;239;238m",
    dim: "\x1b[38;2;15;35;38m",
  },
  amber: {
    snake: "\x1b[38;2;227;160;27m",
    head: "\x1b[38;2;249;213;107m",
    dim: "\x1b[38;2;40;28;5m",
  },
} as const;

type Color = keyof typeof PALETTE;

const GLYPH: Record<string, string[]> = {
  G: ["▄▀▀▄", "▌   ", "▌ ▀█", "▌  █", "▀▄▄▀"],
  o: ["    ", "▄▀▀▄", "█  █", "▀▄▄▀", "    "],
  l: [" █ ", " █ ", " █ ", " ▀▄"],
  a: [" ▄▄ ", "▄  █", "▀▄▄█"],
  d: ["█   ", "█▀▀▄", "█▄▄▀"],
  i: ["▪", " │", " │", " ╵"],
  n: ["▄ ▄", "█▀█", "█ █"],
  g: ["▄▀▀▄", "█  █", "▀▄▄█", "   █", "▀▄▄▀"],
};

const W = 30;
const ROWS = 5;

const GLYPHS_5x4: Record<string, number[][]> = {
  G: [
    [0, 1, 1, 0],
    [1, 0, 0, 0],
    [1, 0, 1, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 1],
  ],
  o: [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
  ],
};

type Cell = { r: number; c: number };

function buildCells(): Cell[] {
  const word = ["G", "o", "o"];
  const GW = 4,
    GAP = 1;
  const totalW = word.length * GW + (word.length - 1) * GAP;
  const startC = Math.floor((W - totalW) / 2);
  const cells: Cell[] = [];
  word.forEach((ch, wi) => {
    const g = GLYPHS_5x4[ch] ?? [];
    g.forEach((row, r) =>
      row.forEach((bit, c) => {
        if (bit) cells.push({ r, c: startC + wi * (GW + GAP) + c });
      }),
    );
  });
  return cells;
}

const LABELS = ["loading", "fetching models", "connecting", "please wait"];

export class GooLoader {
  private targets: Cell[];
  private covered = new Set<string>();
  private snake: Cell[] = [];
  private dir = { r: 0, c: 1 };
  private phase: "covering" | "pause" | "uncovering" = "covering";
  private queue: Cell[] = [];
  private pauseTick = 0;
  private labelIdx = 0;
  private dotCount = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private frameN = 0;

  constructor(private color: Color = "green") {
    this.targets = buildCells();
    this.resetSnake();
  }

  private key(c: Cell) {
    return `${c.r},${c.c}`;
  }

  private resetSnake() {
    this.snake = Array.from({ length: 4 }, (_, i) => ({ r: 2, c: 3 - i }));
    this.dir = { r: 0, c: 1 };
  }

  private nearest(): Cell | null | undefined {
    const rem = this.targets.filter((t) => !this.covered.has(this.key(t)));
    if (!rem.length) return null;
    const h = this.snake[0]!;
    return rem.sort(
      (a, b) =>
        Math.abs(a.r - h.r) +
        Math.abs(a.c - h.c) -
        (Math.abs(b.r - h.r) + Math.abs(b.c - h.c)),
    )[0];
  }

  private steer(t: Cell) {
    const h = this.snake[0]!;
    const opts: (typeof this.dir)[] = [];
    if (t.c > h.c) opts.push({ r: 0, c: 1 });
    else if (t.c < h.c) opts.push({ r: 0, c: -1 });
    if (t.r > h.r) opts.push({ r: 1, c: 0 });
    else if (t.r < h.r) opts.push({ r: -1, c: 0 });
    if (!opts.length) opts.push(this.dir);
    for (const d of opts) {
      if (
        h.r + d.r >= 0 &&
        h.r + d.r < ROWS &&
        h.c + d.c >= 0 &&
        h.c + d.c < W
      ) {
        this.dir = d;
        return;
      }
    }
  }

  private tick() {
    if (this.phase === "pause") {
      if (--this.pauseTick <= 0) {
        this.phase = "uncovering";
        this.queue = [
          ...this.targets.filter((t) => this.covered.has(this.key(t))),
        ].sort(() => Math.random() - 0.5);
        this.labelIdx = (this.labelIdx + 1) % LABELS.length;
      }
      return;
    }

    if (this.phase === "uncovering") {
      for (let i = 0; i < 2; i++) {
        const t = this.queue.shift();
        if (t) this.covered.delete(this.key(t));
      }
      if (!this.queue.length) {
        this.phase = "covering";
        this.covered.clear();
        this.resetSnake();
      }
      return;
    }

    const tgt = this.nearest();
    if (!tgt) {
      this.phase = "pause";
      this.pauseTick = 14;
      return;
    }
    this.steer(tgt);

    const h = this.snake[0]!;
    let nr = h.r + this.dir.r,
      nc = h.c + this.dir.c;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= W) {
      const fb = [
        { r: 0, c: 1 },
        { r: 0, c: -1 },
        { r: 1, c: 0 },
        { r: -1, c: 0 },
      ].find(
        (d) =>
          h.r + d.r >= 0 && h.r + d.r < ROWS && h.c + d.c >= 0 && h.c + d.c < W,
      );
      if (!fb) return;
      this.dir = fb;
      nr = h.r + fb.r;
      nc = h.c + fb.c;
    }

    this.snake.unshift({ r: nr, c: nc });
    const isTarget = this.targets.some((t) => t.r === nr && t.c === nc);
    if (isTarget) {
      this.covered.add(`${nr},${nc}`);
      if (this.snake.length > 6) this.snake.pop();
    } else {
      if (this.snake.length > 8) this.snake.pop();
    }
  }

  private render() {
    const pal = PALETTE[this.color];
    const tset = new Set(this.targets.map((t) => this.key(t)));
    const smap = new Map(this.snake.map((s, i) => [this.key(s), i]));

    const dots = ".".repeat(
      this.frameN % 90 < 30 ? 1 : this.frameN % 90 < 60 ? 2 : 3,
    );
    const label = LABELS[this.labelIdx];

    // build each row as a string, then join with \n and print once
    const rows: string[] = [];

    for (let r = 0; r < ROWS; r++) {
      let row = "  ";
      for (let c = 0; c < W; c++) {
        const k = `${r},${c}`;
        const si = smap.get(k);
        if (si !== undefined) {
          if (si === 0) row += `${pal.head}▮${RESET}`;
          else if (si < 3) row += `${pal.snake}▮${RESET}`;
          else row += `${pal.snake}·${RESET}`;
        } else if (this.covered.has(k)) {
          row += `${pal.snake}▮${RESET}`;
        } else if (tset.has(k)) {
          row += `${pal.dim}▯${RESET}`;
        } else {
          row += " ";
        }
      }
      rows.push(row);
    }

    rows.push(`  ${pal.snake}${label}${dots}${RESET}`);

    // move cursor up (ROWS + 1 label line) only after first frame
    const moveUp = this.frameN > 0 ? `\x1b[${ROWS + 1}A` : "";
    process.stdout.write(moveUp + rows.join("\n") + "\n");
    this.frameN++;
  }

  start() {
    process.stdout.write(HIDE);
    this.tick();
    this.render();
    this.timer = setInterval(() => {
      this.tick();
      this.render();
    }, 80);
    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const up = `\x1b[${ROWS + 1}A`;
    const clearAll = Array(ROWS + 2)
      .fill(CLEAR_LINE)
      .join("\n");
    process.stdout.write(up + clearAll);
  }
}

if (import.meta.main) {
  const color = (process.argv[2] ?? "green") as Color;
  const loader = new GooLoader(color).start();

  setTimeout(() => {
    loader.stop();
    process.exit(0);
  }, 6000);

  process.on("SIGINT", () => {
    loader.stop();
    process.exit(0);
  });
}
