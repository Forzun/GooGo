const HIDE = "\x1b[?25l";
const SHOW = "\x1b[?25h";
const CLEAR = "\r\x1b[2K";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const ZINC = "\x1b[38;2;161;161;170m";
const RESET = "\x1b[0m";

type ThemeName = "zinc" | "green" | "cyan" | "amber";

const THEMES: Record<ThemeName, { spinner: string; wave: string[] }> = {
  zinc: {
    spinner: "\x1b[38;2;161;161;170m",
    wave: [
      "\x1b[38;2;90;90;96m",
      "\x1b[38;2;130;130;138m",
      "\x1b[38;2;180;180;188m",
      "\x1b[38;2;230;230;238m",
      "\x1b[38;2;180;180;188m",
      "\x1b[38;2;130;130;138m",
      "\x1b[38;2;90;90;96m",
    ],
  },
  green: {
    spinner: "\x1b[38;2;63;185;80m",
    wave: [
      "\x1b[38;2;20;55;25m",
      "\x1b[38;2;35;95;42m",
      "\x1b[38;2;55;140;65m",
      "\x1b[38;2;110;230;125m",
      "\x1b[38;2;55;140;65m",
      "\x1b[38;2;35;95;42m",
      "\x1b[38;2;20;55;25m",
    ],
  },
  cyan: {
    spinner: "\x1b[38;2;57;208;216m",
    wave: [
      "\x1b[38;2;15;55;58m",
      "\x1b[38;2;30;95;100m",
      "\x1b[38;2;50;145;152m",
      "\x1b[38;2;110;230;238m",
      "\x1b[38;2;50;145;152m",
      "\x1b[38;2;30;95;100m",
      "\x1b[38;2;15;55;58m",
    ],
  },
  amber: {
    spinner: "\x1b[38;2;227;160;27m",
    wave: [
      "\x1b[38;2;60;42;10m",
      "\x1b[38;2;105;73;18m",
      "\x1b[38;2;160;112;30m",
      "\x1b[38;2;250;200;90m",
      "\x1b[38;2;160;112;30m",
      "\x1b[38;2;105;73;18m",
      "\x1b[38;2;60;42;10m",
    ],
  },
};

const WAVE_SHADES = [
  "\x1b[38;2;15;55;58m",
  "\x1b[38;2;30;95;100m",
  "\x1b[38;2;50;145;152m",
  "\x1b[38;2;110;230;238m", // bright cyan peak
  "\x1b[38;2;50;145;152m",
  "\x1b[38;2;30;95;100m",
  "\x1b[38;2;15;55;58m",
];


const WAVE_WIDTH = WAVE_SHADES.length;
function renderWave(text: string, peak: number): string {
  let out = "";
  const half = Math.floor(WAVE_WIDTH / 2);

  for (let i = 0; i < text.length; i++) {
    const dist = i - peak; // distance from this char to the wave's peak
    let shadeIdx = half - dist; // map distance to shade array index

    let color: string;
    if (shadeIdx >= 0 && shadeIdx < WAVE_WIDTH) {
      color = WAVE_SHADES[shadeIdx]!;
    } else {
      color = ZINC; // default resting color outside the wave's influence
    }

    out += color + text[i];
  }

  return out + RESET;
}

export class SimpleSpinner {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;
  private wavePos = 0;
  private text: string;
  private theme: { spinner: string; wave: string[] };

  constructor(text = "Loading...", themeName: ThemeName = "zinc") {
    this.text = text;
    this.theme = THEMES[themeName];
  }

  setLabel(text: string) {
    this.text = text;
  }

  private renderWave(text: string, peak: number): string {
    const shades = this.theme.wave;
    const half = Math.floor(shades.length / 2);
    let out = "";

    for (let i = 0; i < text.length; i++) {
      const dist = i - peak;
      const shadeIdx = half - dist;
      const color =
        shadeIdx >= 0 && shadeIdx < shades.length
          ? shades[shadeIdx]!
          : this.theme.spinner;
      out += color + text[i];
    }

    return out + RESET;
  }

  start(label?: string) {
    if (label !== undefined && label.trim() !== "") {
      this.text = label;
    }
    this.timer = setInterval(() => {
      const spinner = FRAMES[this.frame % FRAMES.length];
      const half = Math.floor(this.theme.wave.length / 2);
      const wave = this.renderWave(this.text, this.wavePos - half);

      process.stdout.write(
        `${CLEAR}${this.theme.spinner}${spinner}${RESET} ${wave}`,
      );

      this.frame++;
      this.wavePos =
        (this.wavePos + 1) % (this.text.length + this.theme.wave.length);
    }, 250);

    return this;
  }

  stop(message = "Done") {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    process.stdout.write(
      `${CLEAR}${this.theme.spinner}✓${RESET} ${message}\n${SHOW}`,
    );
  }

}

if (import.meta.main) {
  const loader = new SimpleSpinner("thinking").start(" ");

  setTimeout(() => loader.setLabel("fetching models"), 2000);
  setTimeout(() => loader.setLabel("almost done"), 4000);
  setTimeout(() => loader.stop("models loaded"), 6000);

  process.on("SIGINT", () => {
    loader.stop("cancelled");
    process.exit(0);
  });
}
