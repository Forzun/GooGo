const SIMPLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const HIDE = "\x1b[?25l"; // was \x3b
const SHOW = "\x1b[?25h";
const RESET = "\x1b[0m"; // was \x2b — check this too!
const CLEAR_LINE = "\x1b[2K\r"; // was \x2b

export class SimpleSpinner {
  private frame = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private label: string;

  constructor(
    private color: string,
    label = "",
  ) {
    this.label = label;
  }

  start() {
    process.stdout.write(HIDE);
    this.timer = setInterval(() => {
      const f = SIMPLE_FRAMES[this.frame % SIMPLE_FRAMES.length];
      process.stdout.write(
        `${CLEAR_LINE}${this.color}${f}${RESET} ${this.label}`,
      );
      this.frame++;
    }, 80);
    return this;
  }

  setLabel(text: string) {
    this.label = text;
  }

  stop(message?: string) {
    if (this.timer) clearInterval(this.timer);
    process.stdout.write(CLEAR_LINE);
    if (message) process.stdout.write(`${this.color}✔${RESET}  ${message}\n`);
    process.stdout.write(SHOW);
  }
}

const spinner = new SimpleSpinner("\x1b[36m");
spinner.start();
