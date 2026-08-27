const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const R    = "\x1b[0m";
const UP   = (n: number) => `\x1b[${n}A`;
const CLR  = "\r\x1b[2K";

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

// ── Pure zinc palette ─────────────────────────────────────────────────────────
const Z900 = fg( 24,  24,  27);
const Z700 = fg( 63,  63,  70);
const Z500 = fg(113, 113, 122);
const Z400 = fg(161, 161, 170);
const Z200 = fg(228, 228, 231);
const Z50  = fg(250, 250, 251);

const GREEN = fg(134, 239, 172);
const RED   = fg(252, 165, 165);
const AMBER = fg(252, 211,  77);

const SPIN_FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];

// Fade-out sequence: bright → settled dim (6 steps, ~480ms total)
const FADEOUT_COLORS = [Z50, Z200, Z400, Z500, Z700, Z400];
const FADEOUT_STEPS  = FADEOUT_COLORS.length;

// Fade-in sequence for new step reveal: dark → bright (4 steps)
const FADEIN_COLORS  = [Z700, Z500, Z400, Z200];
const FADEIN_STEPS   = FADEIN_COLORS.length;

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  label:       string;
  status:      StepStatus;
  detail?:     string;
  revealed:    boolean;
  revealFrame: number;   // frame when this step was revealed
  doneFrame:   number;   // frame when this step became done/error
  detailFrame: number;   // frame when detail text last changed
}

function renderStep(step: Step, frame: number): string {
  if (!step.revealed) return "";

  const revealAge = frame - step.revealFrame;  // how long since appeared
  const doneAge   = frame - step.doneFrame;    // how long since marked done

  // ── icon ─────────────────────────────────────────────────────────────────
  let icon: string;
  switch (step.status) {
    case "done": {
      // brief bright pop on the ✓ right when it flips, then settles to GREEN
      const popColor = doneAge < 2 ? Z50 : GREEN;
      icon = `${popColor}✓${R}`;
      break;
    }
    case "error": {
      const popColor = doneAge < 2 ? Z50 : RED;
      icon = `${popColor}✗${R}`;
      break;
    }
    case "running":
      icon = `${AMBER}${SPIN_FRAMES[frame % SPIN_FRAMES.length]}${R}`;
      break;
    default:
      icon = `${Z700}·${R}`;
  }

  // ── label color ───────────────────────────────────────────────────────────
  let labelColor: string;

  if (step.status === "done") {
    // smooth fade-out: walk through FADEOUT_COLORS then settle at Z400
    if (doneAge < FADEOUT_STEPS) {
      labelColor = FADEOUT_COLORS[doneAge]!;
    } else {
      labelColor = Z400;
    }
  } else if (step.status === "error") {
    labelColor = doneAge < 2 ? Z50 : Z500;
  } else if (step.status === "running") {
    // fade-in on first reveal
    if (revealAge < FADEIN_STEPS) {
      labelColor = FADEIN_COLORS[revealAge]!;
    } else {
      labelColor = Z200;
    }
  } else {
    // pending — fade in dimly
    labelColor = revealAge < FADEIN_STEPS ? (FADEIN_COLORS[Math.min(revealAge, 1)]!) : Z500;
  }

  const label = `${labelColor}${step.label}${R}`;

  // ── detail ────────────────────────────────────────────────────────────────
  let detail = "";
  if (step.detail && (step.status === "running" || step.status === "done" || step.status === "error")) {
    const detailAge = frame - step.detailFrame;
    const detailColor = detailAge < FADEIN_STEPS
      ? (FADEIN_COLORS[Math.min(detailAge, FADEIN_STEPS - 1)]!)
      : Z500;
    detail = `  ${detailColor}${step.detail}${R}`;
  }

  // ── slide-in on reveal (shift left over 3 frames) ─────────────────────────
  const slide = revealAge < 3 ? " ".repeat(3 - revealAge) : "";

  const lBr = `${Z700}[${R}`;
  const rBr = `${Z700}]${R}`;

  return `${slide}  ${lBr}${icon}${rBr} ${label}${detail}`;
}

// ── StepRunner ────────────────────────────────────────────────────────────────
export class StepRunner {
  private steps:  Step[];
  private timer:  NodeJS.Timeout | null = null;
  private frame   = 0;
  private drawn   = 0;

  private readonly STAGGER_TICKS = 5;  // ~400ms between each step appearing
  private nextRevealAt = 0;
  private revealIdx    = 0;

  constructor(labels: string[]) {
    this.steps = labels.map((label) => ({
      label,
      status:      "pending" as StepStatus,
      revealed:    false,
      revealFrame: -999,
      doneFrame:   -999,
      detailFrame: -999,
    }));
  }

  private render() {
    // reveal next step on schedule
    if (this.revealIdx < this.steps.length && this.frame >= this.nextRevealAt) {
      const s       = this.steps[this.revealIdx]!;
      s.revealed    = true;
      s.revealFrame = this.frame;
      if (this.revealIdx === 0) s.status = "running";
      this.revealIdx++;
      this.nextRevealAt = this.frame + this.STAGGER_TICKS;
    }

    if (this.drawn > 0) process.stdout.write(UP(this.drawn));

    let linesDrawn = 0;
    for (const step of this.steps) {
      if (!step.revealed) continue;
      process.stdout.write(CLR + renderStep(step, this.frame) + "\n");
      linesDrawn++;
    }

    this.drawn = linesDrawn;
    this.frame++;
  }

  // ── public API ────────────────────────────────────────────────────────────

  start(detail?: string) {
    if (detail && this.steps[0]) {
      this.steps[0].detail      = detail;
      this.steps[0].detailFrame = this.frame;
    }
    process.stdout.write(HIDE);
    this.render();
    this.timer = setInterval(() => this.render(), 80);
    return this;
  }

  next(detail?: string) {
    const running = this.steps.find((s) => s.status === "running");
    if (running) {
      running.status    = "done";
      running.detail    = undefined;
      running.doneFrame = this.frame;   // ← triggers fade-out animation
    }

    const nextStep = this.steps.find((s) => s.status === "pending" && s.revealed);
    if (nextStep) {
      nextStep.status      = "running";
      nextStep.revealFrame = this.frame; // reset so fade-in plays from now
      if (detail) {
        nextStep.detail      = detail;
        nextStep.detailFrame = this.frame;
      }
    }
  }

  setDetail(text: string) {
    const running = this.steps.find((s) => s.status === "running");
    if (running && running.detail !== text) {
      running.detail      = text;
      running.detailFrame = this.frame;
    }
  }

  fail(message?: string) {
    const running = this.steps.find((s) => s.status === "running");
    if (running) {
      running.status    = "error";
      running.detail    = message;
      running.doneFrame = this.frame;
      if (message) running.detailFrame = this.frame;
    }
    for (const step of this.steps) {
      if (!step.revealed) {
        step.revealed    = true;
        step.revealFrame = this.frame;
        step.status      = "pending";
      }
    }
    this._stop();
  }

  finish(detail?: string) {
    const running = this.steps.find((s) => s.status === "running");
    if (running) {
      running.status    = "done";
      running.doneFrame = this.frame;
      if (detail) {
        running.detail      = detail;
        running.detailFrame = this.frame;
      }
    }
    for (const step of this.steps) {
      if (!step.revealed) {
        step.revealed    = true;
        step.revealFrame = this.frame;
        step.status      = "done";
        step.doneFrame   = this.frame;
      } else if (step.status === "pending") {
        step.status    = "done";
        step.doneFrame = this.frame;
      }
    }
    this._stop();
  }

  private _stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.render();
    process.stdout.write(SHOW + "\n");
  }
}

// ── Demo ──────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const runner = new StepRunner([
    "Read the files",
    "Understand the project",
    "Generate response",
    "Write to disk",
  ]);

  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  async function run() {
    runner.start("scanning src/...");
    await delay(1400); runner.setDetail("found 12 files");
    await delay(800);  runner.next("parsing AST...");
    await delay(1600); runner.next(); runner.setDetail("streaming from llama3.2...");
    await delay(2200); runner.next();
    await delay(700);  runner.finish("done");
  }

  run();
  process.on("SIGINT", () => { runner.fail("cancelled"); process.exit(0); });
}
