import { chat } from "./chat";
import { executePlan } from "./planner";


const AGENT_PROMPT = `
  Available tools
    read_file(path)
    rename_function(path, old, new)
    edit_function(path, name, instruction)
    create_function(path, name, instruction)
    delete_function(path, name)

    Rules
    Files referenced with @path have already been loaded.
    Do not call read_file.
    Choose exactly one tool.
    Return raw JSON only.
    Never wrap JSON in markdown.

    Use edit_function ONLY if the function name already exists in the file content shown to you.
    Use create_function if the function does NOT exist yet, or if the user does not name an existing function.
    If the user does not give a function name, invent a short, clear, camelCase name based on their request.

    Examples

    User
    @utils/filter.ts rename sum to Sum function
    Response
    {"type":"rename_function","path":"utils/filter.ts","old":"sum","new":"Sum"}

    User
    @utils/filter.ts make sum always return 5
    Response
    {"type":"edit_function","path":"utils/filter.ts","name":"sum","instruction":"always return 5"}

    User
    @utils/filter.ts create a function that checks if a number is even
    Response
    {"type":"create_function","path":"utils/filter.ts","name":"isEven","instruction":"checks if a number is even, takes a number and returns a boolean"}

    User
    @utils/filter.ts add a new function
    Response
    {"type":"create_function","path":"utils/filter.ts","name":"newFunction","instruction":"ask the user what the function should do"}


    `;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function runAgent({
  messages,
  model,
  prompt,
}: {
  messages: ChatMessage[];
  model: string;
  prompt: string;
}) {
  let working: ChatMessage[] = [
    {
      role: "system",

      content: AGENT_PROMPT,
    },
    ...messages,
  ];

  console.log("message went here:", prompt);
  const response = await chat({
    model: model,
    messages: working,
  });

  if (!response) {
    throw new Error("no new response");
  }

  const cleaned = response!
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const plan = JSON.parse(cleaned);

    console.log("parsed plan:");
    console.log(plan);

    const result = await executePlan(plan, model, prompt);

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
