const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const R    = "\x1b[0m";
const UP   = (n: number) => `\x1b[${n}A`;
const CLR  = "\r\x1b[2K";

const fg = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

const GREEN  = fg(134, 239, 172);  // done ✓
const ORANGE = fg(251, 146, 60);   // running spinner
const MUTED  = fg(113, 113, 122);  // pending
const WHITE  = fg(228, 228, 231);  // step text
const DIM    = fg(82,  82,  91);   // bracket color

const SPIN_FRAMES = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];

type StepStatus = "pending" | "running" | "done" | "error"

interface Step {
  label: string;
  status: StepStatus;
  detail?:string
}


function renderStep(step: Step , spinFrame: number): string {
  let icon: string

  switch (step.status) {
    case "done":
      icon = `${GREEN}✓${R}`;
      break;
      case "error":
        icon = `${fg(239,68,68)}✗${R}`;
        break;
      case "running":
        icon = `${ORANGE}${SPIN_FRAMES[spinFrame % SPIN_FRAMES.length]}${R}`;
        break;
      default:
        icon = `${MUTED} ${R}`;
  }

  const bracket = (s: string) => `${DIM}[${R}${s}${DIM}]${R}`;

  const label = step.status === "pending"
    ? `${MUTED}${step.label}${R}`
    : step.status === "done"
    ? `${WHITE}${step.label}${R}`
    : `${WHITE}${step.label}${R}`;

  const detail = step.status === "pending" && step.detail ? `  ${MUTED}${step.detail}${R}`
    : "";

  return `  ${bracket(icon)} ${label}${detail}`;
}

// ── StepRunner class ──────────────────────────────────────────────────────────
export class StepRunner {
  private steps: Step[];
  private timer: NodeJS.Timeout | null = null;
  private frame  = 0;
  private drawn  = false;
  private currentStep = 0;

  constructor(labels: string[]) {
    this.steps = labels.map(label => ({ label, status: "pending" as StepStatus }));
  }

  // ── internal render ─────────────────────────────────────────────────────────
  private render() {
    if (this.drawn) process.stdout.write(UP(this.steps.length));

    for (const step of this.steps) {
      process.stdout.write(CLR + renderStep(step, this.frame) + "\n");
    }

    this.drawn = true;
    this.frame++;
  }

  // ── public API ──────────────────────────────────────────────────────────────

  /** Start the animation loop and mark the first step as running */
  start() {
    process.stdout.write(HIDE + "\n".repeat(this.steps.length));
    this.markRunning(0);
    this.timer = setInterval(() => this.render(), 80);
    return this;
  }

  /** Advance — mark current step done, start next one */
  next(detail?: string) {
    if (this.currentStep < this.steps.length) {
      this.steps[this.currentStep]!.status = "done";
      this.currentStep++;
    }
    if (this.currentStep < this.steps.length) {
      this.markRunning(this.currentStep, detail);
    }
    this.render();
  }

  /** Mark current running step with a live detail string */
  setDetail(text: string) {
    if (this.steps[this.currentStep]) {
      this.steps[this.currentStep]!.detail = text;
    }
  }

  /** Mark a step as errored and stop */
  fail(message?: string) {
    if (this.steps[this.currentStep]) {
      this.steps[this.currentStep]!.status = "error";
      if (message) this.steps[this.currentStep]!.detail = message;
    }
    this.stop();
  }

  /** Mark all remaining steps done and stop the loop */
  finish() {
    for (const step of this.steps) {
      if (step.status !== "error") step.status = "done";
    }
    this.stop();
  }

  private markRunning(idx: number, detail?: string) {
    if (this.steps[idx]) {
      this.steps[idx]!.status = "running";
      this.steps[idx]!.detail = detail;
    }
  }

  private stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.render();
    process.stdout.write(SHOW + "\n");
  }
}

// ── demo ──────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const runner = new StepRunner([
    "Read the files",
    "Understand the project",
    "Generate response",
    "Write to disk",
  ]);

  runner.start();

  // simulate async steps
  const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  async function run() {
    await delay(1200);
    runner.setDetail("scanning src/...");

    await delay(800);
    runner.next("parsing AST...");  // done: Read files → running: Understand

    await delay(1500);
    runner.next();                  // done: Understand → running: Generate

    runner.setDetail("streaming from llama3.2...");
    await delay(2000);
    runner.next();                  // done: Generate → running: Write

    await delay(600);
    runner.finish();                // all done
  }

  run();

  process.on("SIGINT", () => { runner.fail("cancelled"); process.exit(0); });
}
