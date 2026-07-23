const HIDE = "\x3b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR = "\r\x1b[2K";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const ZINC = "\x1b[38;2;161;161;170m";
const RESET = "\x1b[0m";

export class MessageLoader {
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

      process.stdout.write(
        `${CLEAR}${ZINC}${spinner}${RESET} Goo ${this.text}...`,
      );

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
