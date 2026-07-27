import { getEffectiveTypeRoots, isThrowStatement } from "typescript";
import { createFunction } from "../tools/create-function";
import { deleteFunction } from "../tools/delete-function";
import { editFunction } from "../tools/edit-function";
import { customTrimmed } from "../tools/read-file";
import { renameFunction } from "../tools/rename-function";
import { replaceBlock } from "../tools/replace-block";
import { chat } from "./chat";
import type { Plan } from "./type";
import { findFunction } from "../tools/find-function";

export async function executePlan(plan: Plan, model: string, prompt: string) {
  switch (plan.type) {
    case "ask_user":
      return plan.question;

    case "modify_function": {
      const file = Bun.file(plan.path);
      const content = await file.text();
      const exists = findFunction(plan.name, content);

      if (exists) {
        return await editFunction({
          path: plan.path,
          name: plan.name,
          instruction: plan.instruction,
          model,
          prompt,
        });
      } else {
        return await createFunction({
          path: plan.path,
          name: plan.name,
          instruction: plan.instruction,
          model,
          prompt,
        });
      }
    }

    case "rename_function":
      return await renameFunction(plan.path, plan.old, plan.new);

    case "edit_function":
      console.log("inside edit_function case");

      const result = await editFunction({
        path: plan.path,
        name: plan.name,
        instruction: plan.instruction,
        model: model,
        prompt,
      });

      return result;

    case "read_file":
      return customTrimmed(plan.path);

    case "delete_function":
      return deleteFunction(plan.path, plan.name);

    case "replaceBlock_function":
      return replaceBlock(plan.content, plan.oldBlock, plan.newBlock);

    case "create_function":
      return await createFunction({
        path: plan.path,
        name: plan.name,
        instruction: plan.instruction,
        model: plan.model,
        prompt: plan.prompt,
      });

    default:
      console.log("unknown plan type", plan);
      return {
        error: `Unrecognized tool: ${plan}`,
      };
  }
}

const PLANNER_PROMPT = `
You are a routing assistant for a code-editing CLI tool called Goo.
Your ONLY job is to decide what the user wants, and extract the information needed — nothing else.

You do NOT write code. You do NOT explain. You return ONLY raw JSON.

Available actions:
- "answer"           → user is just chatting, asking a question, or doesn't need a file edit
- "rename_function"  → user wants to rename a function
- "modify_function"  → user wants to change, fix, or add to a function (existing OR new — you don't need to know if it exists)
- "delete_function"  → user wants to remove a function
- "read_file"        → user wants to see/explain file contents (only if no @path content was already given)

Rules:
1. Files referenced with @path have already been loaded into context. Do NOT use read_file for files already shown to you.
2. Return EXACTLY one JSON object. No markdown. No \`\`\`. No explanation. No extra text before or after.
3. If the user is just having a conversation, asking a general question, or the request has nothing to do with editing a file, return: {"type":"answer"}
4. Always extract "path" as a relative path with no leading @ symbol.
5. For "modify_function" — this covers BOTH creating a new function and editing an existing one. Do not try to guess which one it is. Just extract the name and what they want.
6. If no function name is given, invent a short, clear camelCase name based on the request.
7. "instruction" should be a short, clear description of what change is needed — written as an instruction, not a question.

JSON shape:
{
  "type": "rename_function" | "modify_function" | "delete_function" | "read_file" | "answer",
  "path": "relative/path.ts",
  "name": "functionName",
  "old": "oldName",
  "new": "newName",
  "instruction": "what to do"
}

Only include the fields relevant to the chosen type. Omit irrelevant fields entirely.

Examples:

User: @utils/filter.ts rename sum to Sum
Response: {"type":"rename_function","path":"utils/filter.ts","old":"sum","new":"Sum"}

User: @utils/filter.ts make sum always return 5
Response: {"type":"modify_function","path":"utils/filter.ts","name":"sum","instruction":"always return 5"}

User: @utils/filter.ts create a function that checks if a number is even
Response: {"type":"modify_function","path":"utils/filter.ts","name":"isEven","instruction":"checks if a number is even, takes a number and returns a boolean"}

User: @utils/filter.ts delete the sum function
Response: {"type":"delete_function","path":"utils/filter.ts","name":"sum"}

User: what does this function do
Response: {"type":"answer"}

User: how do I center a div in css
Response: {"type":"answer"}

User: can you explain what async/await does
Response: {"type":"answer"}

Return ONLY the JSON object.
`;
export async function Planner(prompt: string, model: string) {
  try {
    const response = await chat({
      model: model,
      messages: [
        {
          role: "system",
          content: PLANNER_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    if (!response) {
      return {
        type: "answer",
      };
    }

    const cleaned = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const plan = JSON.parse(cleaned);
      return plan;
    } catch {
      return {
        type: "answer",
      };
    }
  } catch (error) {
    throw new Error("model is not working please check in it running or not"+ error)
  }
}
