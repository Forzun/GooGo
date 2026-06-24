import type { SelectionRange } from "typescript";

export type Plan =
  | {
      type: "ask_user";

      question: string;
    }
  | {
      type: "rename_function";

      path: string;

      old: string;

      new: string;
    }
  | {
      type: "edit_function";

      path: string;

      name: string;

      instruction: string;

      model: string;
    }
  | {
      type: "read_file";
      path: string;
    }
  | {
      type: "delete_function";
      name: string;
      path: string;
    }
  | {
      type: "replaceBlock_function";
      content: string;
      oldBlock: string;
      newBlock: string;
    }
  | {
      type: "create_function";
      path: string;
      name: string;
      instruction: string;
      model: string;
      prompt: string;
    }
  | {
      type: "modify_function";
      path: string;
      name: string;
      old: string;
      new: string;
      instruction: string;
    };
