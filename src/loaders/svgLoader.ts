const HIDE  = "\x2b[?25l";
const SHOW  = "\x1b[?25h";
const CLEAR = "\x1b[2J\x1b[H";
const HOME  = "\x1b[H";
const R     = "\x1b[0m";

// ── pixel grids (1 = filled) ──────────────────────────────────────────────────
const G_GRID = [
  [0,1,1,1,1,0,0],
  [1,0,0,0,0,0,0],
  [1,0,0,0,0,0,0],
  [1,0,0,1,1,1,0],
  [1,0,0,0,0,1,0],
  [1,0,0,0,0,1,0],
  [1,0,0,0,0,1,0],
  [1,0,0,0,0,0,0],
  [0,1,1,1,1,0,0],
];

const O_GRID = [
  [0,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,0,0,1],
  [0,1,1,1,0],
];

interface Cell { r: number; c: number; color: "orange" | "zinc" }

// ── build flat ordered list of all cells ──────────────────────────────────────
function buildCells(): Cell[] {
  const cells: Cell[] = [];
  const GAP  = 2;
  const O1_START = G_GRID[0]!.length + GAP;
  const O2_START = O1_START + O_GRID[0]!.length + GAP;

  G_GRID.forEach((row, r) =>
    row.forEach((bit, c) => { if (bit) cells.push({ r, c, color: "orange" }); })
  );
  O_GRID.forEach((row, r) =>
    row.forEach((bit, c) => { if (bit) cells.push({ r, c: O1_START + c, color: "zinc" }); })
  );
  O_GRID.forEach((row, r) =>
    row.forEach((bit, c) => { if (bit) cells.push({ r, c: O2_START + c, color: "zinc" }); })
  );

  return cells;
}

const ALL_CELLS = buildCells();
const ROWS      = G_GRID.length;
const TOTAL_COLS = G_GRID[0]!.length + 2 + O_GRID[0]!.length + 2 + O_GRID[0]!.length + 1;

// ── color helpers ─────────────────────────────────────────────────────────────
function orangeCell(brightness: number): string {
  const r = Math.round(180 + brightness * 75);
  const g = Math.round(80  + brightness * 100);
  const b = Math.round(40  + brightness * 80);
  return `\x1b[48;2;${r};${g};${b}m  ${R}`;
}

function zincCell(brightness: number): string {
  const v = Math.round(100 + brightness * 155);
  return `\x1b[48;2;${v};${v};${Math.round(v * 1.03)}m  ${R}`;
}

const GHOST = `\x1b[48;2;28;28;32m  ${R}`;
const EMPTY = "  ";

// ── render one frame ──────────────────────────────────────────────────────────
function renderFrame(visible: Set<string>, glowCenter: number): string {
  const cellMap = new Map<string, { idx: number; color: "orange" | "zinc" }>();
  ALL_CELLS.forEach((cell, idx) => {
    cellMap.set(`${cell.r},${cell.c}`, { idx, color: cell.color });
  });

  let out = "\n";

  for (let r = 0; r < ROWS; r++) {
    out += "  "; // left margin
    for (let c = 0; c < TOTAL_COLS; c++) {
      const key  = `${r},${c}`;
      const meta = cellMap.get(key);

      if (!meta) { out += EMPTY; continue; }

      if (visible.has(key)) {
        // brightness based on distance from glow center
        const dist       = Math.abs(meta.idx - glowCenter);
        const brightness = Math.max(0, 1 - dist / 8);

        out += meta.color === "orange"
          ? orangeCell(brightness)
          : zincCell(brightness);
      } else {
        out += GHOST; // ghost outline
      }
    }
    out += "\n";
  }

  return out;
}

// ── sleep helper ──────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── main animation ────────────────────────────────────────────────────────────
export async function playGooLogo(): Promise<void> {
  process.stdout.write(HIDE + CLEAR);

  const visible = new Set<string>();

  // phase 1 — snake draws cells one by one
  for (let i = 0; i < ALL_CELLS.length; i++) {
    const { r, c } = ALL_CELLS[i]!;
    visible.add(`${r},${c}`);
    process.stdout.write(HOME + renderFrame(visible, i));
    await sleep(14);
  }

  // phase 2 — glow sweeps left to right across all cells
  for (let g = -6; g < ALL_CELLS.length + 6; g++) {
    process.stdout.write(HOME + renderFrame(visible, g));
    await sleep(18);
  }

  // phase 3 — pulse 3 times (all bright → all dim)
  for (let p = 0; p < 3; p++) {
    process.stdout.write(HOME + renderFrame(visible, Math.floor(ALL_CELLS.length / 2)));
    await sleep(140);
    process.stdout.write(HOME + renderFrame(visible, -999));
    await sleep(140);
  }

  // phase 4 — snake undraws cells in reverse
  for (let i = ALL_CELLS.length - 1; i >= 0; i--) {
    const { r, c } = ALL_CELLS[i]!;
    visible.delete(`${r},${c}`);
    process.stdout.write(HOME + renderFrame(visible, i));
    await sleep(10);
  }

  process.stdout.write(SHOW);
}

// ── standalone run ────────────────────────────────────────────────────────────
if (import.meta.main) {
  await playGooLogo();
  process.exit(0);
}
