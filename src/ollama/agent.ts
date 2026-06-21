import { chat } from "./chat";
import { executePlan } from "./planner";

const AGENT_PROMPT = `
  Available tools

  read_file(path)

  rename_function(path, old, new)

  edit_function(path, name, instruction)


  Rules

  If you need to inspect a file before deciding,
  always call read_file first.

  Never assume a function exists.

  Never assume a file exists.

  After receiving tool results,
  you may call another tool.

  Only answer normally if no tools are needed.


  Examples


  User

  @utils/filter.ts rename sum to Sum


  Response

  {
  "type":"tool",

  "tool":"read_file",

  "path":"utils/filter.ts"

  }



  Tool Result

  export function sum(){

  }



  Response

  {
  "type":"tool",

  "tool":"rename_function",

  "path":"utils/filter.ts",

  "old":"sum",

  "new":"Sum"

  }
`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function runAgent({
  messages,
  model,
}: {
  messages: ChatMessage[];
  model: string;
}) {
  let working: ChatMessage[] = [
    {
      role: "system",

      content: AGENT_PROMPT,
    },
    ...messages,
  ];

  while (true) {
    const response = await chat({
      messages: working,
      model: model,
    });

    if (!response) {
      throw new Error("response not received!");
    }

    try {
      const tool = JSON.parse(response!);

      console.log("what tool returning:", tool);

      const result = await executePlan(tool);

      working.push({
        role: "assistant",
        content: response,
      });

      working.push({
        role: "user",
        content: `Tool Result
        ${result}`,
      });

      continue;
    } catch {
      return {
        type: "answer",
        content: response,
      };
    }
  }
}
