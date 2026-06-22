import { kMaxLength } from "node:buffer";
import { chat } from "./chat";
import { executePlan, Planner } from "./planner";
import { errorMonitor } from "node:events";
import { error } from "node:console";

const AGENT_PROMPT = `
  Available tools

  read_file(path)

  rename_function(path, old, new)

  edit_function(path, name, instruction)


  Rules

  Files referenced with @path have already been loaded.

  Do not call read_file.

  Choose exactly one tool.

  Return raw JSON only.

  Never wrap JSON in markdown..

  Only answer normally if no tools are needed.


  Examples


  User

  @utils/filter.ts rename sum to Sum function


  Response

  {
  "type":"rename_function",

  "path":"utils/filter.ts",

  "old":"sum",

  "new":"Sum"

  }



  Tool Result

  export function Sum(){

  }


  User

  @utils/filter.ts make sum always return 5


  Response

  {
  "type":"edit_function",

  "path":"utils/filter.ts",

  "name":"sum",

  "instruction":"always return 5"

  }

  Response

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

  const response = await chat({
    model: model,
    messages: working,
  });

  const cleaned = response!
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  if (!response) {
    throw new Error("no new response");
  }

  try {
    const plan = JSON.parse(cleaned);

    console.log("parsed plan:");
    console.log(plan);

    const result = await executePlan(plan, model);

    console.log("executePlan result:");
    console.log(result);

    return {
      type: "tool",
      result,
    };
  } catch (e) {
    console.log("json parse failed");
    console.log(e);

    return {
      type: "chat",
    };
  }
}
