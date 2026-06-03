const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR = "\r\x1b[2K";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class GooLoader {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private text: string;

  constructor(text = "Loading") {
    this.text = text;
  }

  start() {
    process.stdout.write(HIDE);

    this.timer = setInterval(() => {
      const spinner = FRAMES[this.frame % FRAMES.length];

      process.stdout.write(`${CLEAR}${spinner} Goo ${this.text}...`);

      this.frame++;
    }, 80);

    return this;
  }

  stop(message = "Done") {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    process.stdout.write(`${CLEAR}✓ Goo ${message}\n${SHOW}`);
  }
}
