const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const R    = "\x1b[0m";
const BOLD = "\x1b[1m";
const UP   = (n: number) => `\x1b[${n}A`;
const CLR  = "\r\x1b[2K";

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

// ── Pure zinc palette ─────────────────────────────────────────────────────────
const Z900 = fg( 24,  24,  27);   // zinc-900
const Z700 = fg( 63,  63,  70);   // zinc-700  — brackets, pending dot
const Z500 = fg(113, 113, 122);   // zinc-500  — detail text
const Z400 = fg(161, 161, 170);   // zinc-400  — step label
const Z200 = fg(228, 228, 231);   // zinc-200  — active/done label
const Z50  = fg(250, 250, 251);   // zinc-50   — bright pop on done

const GREEN  = fg(134, 239, 172);  // green-300  — ✓ done
const RED    = fg(252, 165, 165);  // red-300    — ✗ error
const AMBER  = fg(252, 211,  77);  // amber-300  — spinner

const SPIN_FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  label:    string;
  status:   StepStatus;
  detail?:  string;
  revealed: boolean;
}

// ── Render one step line ──────────────────────────────────────────────────────
function renderStep(step: Step, spinFrame: number): string {
  if (!step.revealed) return "";

  let icon: string;
  switch (step.status) {
    case "done":    icon = `${GREEN}✓${R}`;  break;
    case "error":   icon = `${RED}✗${R}`;    break;
    case "running": icon = `${AMBER}${SPIN_FRAMES[spinFrame % SPIN_FRAMES.length]}${R}`; break;
    default:        icon = `${Z700}·${R}`;   break;
  }

  // label: dimmer when pending, brighter when active/done
  const labelColor = step.status === "pending" ? Z500
                   : step.status === "done"    ? Z400
                   : Z200;

  const label = `${labelColor}${step.label}${R}`;

  const detail = step.detail && (step.status === "running" || step.status === "done")
    ? `  ${Z500}${step.detail}${R}`
    : "";

  const lBr = `${Z700}[${R}`;
  const rBr = `${Z700}]${R}`;

  return `  ${lBr}${icon}${rBr} ${label}${detail}`;
}

// ── StepRunner ────────────────────────────────────────────────────────────────
export class StepRunner {
  private steps:  Step[];
  private timer:  NodeJS.Timeout | null = null;
  private frame   = 0;
  private drawn   = 0;

  // ticks between each step appearing (stagger)
  private readonly STAGGER_TICKS = 5;  // ~400ms
  private nextRevealAt = 0;
  private revealIdx    = 0;

  constructor(labels: string[]) {
    this.steps = labels.map((label) => ({
      label,
      status:   "pending" as StepStatus,
      revealed: false,
    }));
  }

  private render() {
    // reveal next step on schedule
    if (this.revealIdx < this.steps.length && this.frame >= this.nextRevealAt) {
      const s     = this.steps[this.revealIdx]!;
      s.revealed  = true;
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
    if (detail && this.steps[0]) this.steps[0].detail = detail;
    process.stdout.write(HIDE);
    this.render();
    this.timer = setInterval(() => this.render(), 80);
    return this;
  }

  next(detail?: string) {
    const running = this.steps.find((s) => s.status === "running");
    if (running) {
      running.status = "done";
      running.detail = undefined;
    }
    const nextStep = this.steps.find((s) => s.status === "pending" && s.revealed);
    if (nextStep) {
      nextStep.status = "running";
      nextStep.detail = detail;
    }
  }

  setDetail(text: string) {
    const running = this.steps.find((s) => s.status === "running");
    if (running) running.detail = text;
  }

  fail(message?: string) {
    const running = this.steps.find((s) => s.status === "running");
    if (running) { running.status = "error"; running.detail = message; }

    // reveal any hidden steps as pending so the list looks complete
    for (const step of this.steps) {
      if (!step.revealed) {
        step.revealed = true;
        step.status   = "pending";
      }
    }

    this._stop();
  }

  finish(detail?: string) {
    // mark current running step done
    const running = this.steps.find((s) => s.status === "running");
    if (running) { running.status = "done"; running.detail = detail; }

    // force-reveal any steps that haven't appeared yet and mark them done
    // so "Finishing up" and any other pending steps always show up
    for (const step of this.steps) {
      if (!step.revealed) {
        step.revealed = true;
        step.status   = "done";
      } else if (step.status === "pending") {
        step.status = "done";
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
