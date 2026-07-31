type ToolCall =
  | {
      type: "create";

      path: string;

      content: string;
    }
  | {
      type: "write";

      path: string;

      content: string;
    }

    | {
      type: "replace";

      path: string;

      old: string;

      new: string;
    };

export interface FoundFunction {
  start: number;
  end: number;
  source: string;
}
